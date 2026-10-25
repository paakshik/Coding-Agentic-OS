@echo off
REM ============================================================================
REM CODING AGENTIC OS — Single-Click Desktop Launcher
REM ============================================================================
REM This script starts the Coding Agentic OS application with all required services.
REM It checks for existing instances, starts the backend, waits for health readiness,
REM opens the UI, and provides useful error messages.
REM ============================================================================

setlocal enabledelayedexpansion

set "APP_NAME=Coding Agentic OS"
set "APP_DIR=%~dp0"
set "BACKEND_PORT=3456"
set "WS_PORT=3457"
set "HEALTH_TIMEOUT=60"
set "NODE_EXE=node"

title %APP_NAME% Launcher

echo.
echo ================================================================================
echo  %APP_NAME% — Starting up...
echo ================================================================================
echo.

REM Check if already running
tasklist /FI "IMAGENAME eq electron.exe" /FI "WINDOWTITLE eq %APP_NAME%*" 2>nul | find /I "electron.exe" >nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] %APP_NAME% appears to be already running.
    echo [INFO] Bringing existing window to front...
    powershell -Command ^
        "$wshell = New-Object -ComObject WScript.Shell; ^
         $wshell.AppActivate('%APP_NAME%')" 2>nul
    goto :eof
)

REM Check for Node.js
where %NODE_EXE% >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found in PATH.
    echo [ERROR] Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] Node.js found: & %NODE_EXE% --version

REM Check if backend port is already in use
powershell -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient; ^
     try { $client.Connect('127.0.0.1', %BACKEND_PORT%); $client.Close(); exit 0 } ^
     catch { exit 1 }" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [WARN] Port %BACKEND_PORT% is already in use.
    echo [WARN] Another instance may be running, or another service is using the port.
    echo [WARN] Attempting to continue anyway...
    echo.
)

REM Change to app directory
cd /d "%APP_DIR%"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to change to application directory: %APP_DIR%
    pause
    exit /b 1
)

REM Check for package.json
if not exist "package.json" (
    echo [ERROR] package.json not found in %APP_DIR%
    echo [ERROR] Application files may be missing or corrupted.
    pause
    exit /b 1
)

REM Check for node_modules
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo [INFO] This may take a minute on first run...
    npm install --prefer-offline --no-audit --no-fund 2>&1 | findstr /V /C:"npm WARN" /C:"added" /C:"removed"
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies.
        echo [ERROR] Try running 'npm install' manually in %APP_DIR%
        pause
        exit /b 1
    )
    echo [INFO] Dependencies installed successfully.
    echo.
)

REM Build if dist doesn't exist or source is newer
if not exist "dist" (
    echo [INFO] Building application...
    npm run build 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Build failed.
        pause
        exit /b 1
    )
    echo [INFO] Build completed.
    echo.
) else (
    REM Quick check if source is newer than dist
    for %%f in (src\renderer\main.tsx) do (
        if "%%~tf" GTR "%%~tf" (
            echo [INFO] Source files changed, rebuilding...
            npm run build 2>&1
            if %ERRORLEVEL% NEQ 0 (
                echo [ERROR] Build failed.
                pause
                exit /b 1
            )
            echo [INFO] Rebuild completed.
            echo.
        )
    )
)

REM Start the application
echo [INFO] Starting %APP_NAME%...
echo [INFO] Backend will be available at http://127.0.0.1:%BACKEND_PORT%
echo [INFO] WebSocket at ws://127.0.0.1:%WS_PORT%
echo.

REM Launch Electron app
start "" "%NODE_EXE%" node_modules/electron/dist/electron.exe dist/main/index.js

REM Wait for backend to be healthy
echo [INFO] Waiting for backend health check (timeout: %HEALTH_TIMEOUT%s)...
set "ELAPSED=0"
:HEALTH_CHECK
if %ELAPSED% GEQ %HEALTH_TIMEOUT% (
    echo [WARN] Backend health check timed out after %HEALTH_TIMEOUT% seconds.
    echo [WARN] The application may still be starting. Check the console for errors.
    goto :LAUNCHED
)

powershell -Command ^
    "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:%BACKEND_PORT%/health' -TimeoutSec 2 -ErrorAction Stop; ^
           if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } ^
     catch { exit 1 }" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Backend is healthy!
    goto :LAUNCHED
)

timeout /t 2 /nobreak >nul
set /a ELAPSED+=2
goto :HEALTH_CHECK

:LAUNCHED
echo.
echo ================================================================================
echo  %APP_NAME% is running!
echo ================================================================================
echo.
echo  Backend API:  http://127.0.0.1:%BACKEND_PORT%
echo  WebSocket:    ws://127.0.0.1:%WS_PORT%
echo.
echo  Press Ctrl+C in this window to stop all services.
echo ================================================================================

REM Keep window open to show logs
cmd /k