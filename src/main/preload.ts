import { contextBridge, ipcRenderer } from 'electron';

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
    };
  }
}