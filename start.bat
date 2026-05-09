@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title Expense Tracker - Launcher
cd /d "%~dp0"

REM Pick a free TCP port for dev / preview by scanning a small range.
REM Falls back to the original number if PowerShell can't find a free one.
set DEV_PORT=
for /f "delims=" %%I in ('powershell -NoProfile -Command "$p=9999; while($p -lt 10100){ if(-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)){ $p; break }; $p++ }"') do set DEV_PORT=%%I
if "%DEV_PORT%"=="" set DEV_PORT=9999

set PREVIEW_PORT=
for /f "delims=" %%I in ('powershell -NoProfile -Command "$p=9998; while($p -lt 10100){ if(-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)){ $p; break }; $p++ }"') do set PREVIEW_PORT=%%I
if "%PREVIEW_PORT%"=="" set PREVIEW_PORT=9998

:menu
cls
echo ============================================
echo    Expense Tracker - Local Launcher
echo ============================================
echo.
echo   [1] Install dependencies (npm install)
echo   [2] Start dev server (npm run dev)        port: %DEV_PORT%
echo   [3] Build production (npm run build)
echo   [4] Preview production build              port: %PREVIEW_PORT%
echo   [5] Open dev URL in browser (http://localhost:%DEV_PORT%)
echo   [6] Clean node_modules and reinstall
echo   [7] Show project info
echo   [8] Re-detect free ports
echo   [0] Exit
echo.
set /p choice=Select an option:

if "%choice%"=="1" goto install
if "%choice%"=="2" goto dev
if "%choice%"=="3" goto build
if "%choice%"=="4" goto preview
if "%choice%"=="5" goto open
if "%choice%"=="6" goto clean
if "%choice%"=="7" goto info
if "%choice%"=="8" goto rescan
if "%choice%"=="0" goto end
goto menu

:install
echo.
echo [INFO] Installing dependencies...
call npm install
echo.
pause
goto menu

:dev
echo.
echo [INFO] Starting dev server on port %DEV_PORT%...
echo [TIP] Press Ctrl+C to stop the server.
start "" http://localhost:%DEV_PORT%
call npm run dev -- --port %DEV_PORT% --strictPort
pause
goto menu

:build
echo.
echo [INFO] Building production bundle...
call npm run build
echo.
pause
goto menu

:preview
echo.
echo [INFO] Starting preview server on port %PREVIEW_PORT%...
start "" http://localhost:%PREVIEW_PORT%
call npm run preview -- --port %PREVIEW_PORT% --strictPort
pause
goto menu

:open
start "" http://localhost:%DEV_PORT%
goto menu

:clean
echo.
echo [WARN] This will delete node_modules and package-lock.json.
set /p confirm=Continue? (y/N):
if /i not "%confirm%"=="y" goto menu
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /q package-lock.json
echo [INFO] Reinstalling...
call npm install
pause
goto menu

:info
echo.
echo Project:      Expense Tracker (React + Vite + TypeScript)
echo Path:         %cd%
echo Dev port:     %DEV_PORT%
echo Preview port: %PREVIEW_PORT%
echo.
node -v
npm -v
echo.
pause
goto menu

:rescan
set DEV_PORT=
for /f "delims=" %%I in ('powershell -NoProfile -Command "$p=9999; while($p -lt 10100){ if(-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)){ $p; break }; $p++ }"') do set DEV_PORT=%%I
if "%DEV_PORT%"=="" set DEV_PORT=9999
set PREVIEW_PORT=
for /f "delims=" %%I in ('powershell -NoProfile -Command "$p=9998; while($p -lt 10100){ if(-not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)){ $p; break }; $p++ }"') do set PREVIEW_PORT=%%I
if "%PREVIEW_PORT%"=="" set PREVIEW_PORT=9998
echo Detected dev=%DEV_PORT% preview=%PREVIEW_PORT%
pause
goto menu

:end
endlocal
exit /b 0
