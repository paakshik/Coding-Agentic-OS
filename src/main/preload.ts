import { contextBridge, ipcRenderer } from 'electron';

// Auth token will be injected at runtime via IPC
let authToken: string | null = null;
ipcRenderer.on('auth:token', (_e, token: string) => { authToken = token; });

contextBridge.exposeInMainWorld('electronAPI', {
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),
    showMessage: (options: { type: 'info' | 'warning' | 'error'; title: string; message: string }) =>
      ipcRenderer.invoke('dialog:show-message', options),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPath: (name: 'userData' | 'temp' | 'home') => ipcRenderer.invoke('app:get-path', name),
  },
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu:action', (_e, action) => callback(action));
    return () => ipcRenderer.removeAllListeners('menu:action');
  },
  getAuthToken: () => authToken,
  getApiBaseUrl: () => 'http://127.0.0.1:3456',
  getWsUrl: () => 'ws://127.0.0.1:3457',
});

declare global {
  interface Window {
    electronAPI: {
      dialog: {
        openDirectory: () => Promise<string | null>;
        showMessage: (options: { type: 'info' | 'warning' | 'error'; title: string; message: string }) => Promise<void>;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
      };
      app: {
        getVersion: () => Promise<string>;
        getPath: (name: 'userData' | 'temp' | 'home') => Promise<string>;
      };
      onMenuAction: (callback: (action: string) => void) => () => void;
      getAuthToken: () => string | null;
      getApiBaseUrl: () => string;
      getWsUrl: () => string;
    };
  }
}