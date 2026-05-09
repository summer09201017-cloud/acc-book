@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title Expense Tracker - Launcher
cd /d "%~dp0"

:menu
cls
echo ============================================
echo    Expense Tracker - Local Launcher
echo ============================================
echo.
echo   [1] Install dependencies (npm install)
echo   [2] Start dev server (npm run dev)
echo   [3] Build production (npm run build)
echo   [4] Preview production build (npm run preview)
echo   [5] Open in browser (http://localhost:5173)
echo   [6] Clean node_modules and reinstall
echo   [7] Show project info
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
echo [INFO] Starting dev server...
echo [TIP] Press Ctrl+C to stop the server.
start "" http://localhost:5173
call npm run dev
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
echo [INFO] Starting preview server...
start "" http://localhost:4173
call npm run preview
pause
goto menu

:open
start "" http://localhost:5173
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
echo Project: Expense Tracker (React + Vite + TypeScript)
echo Path:    %cd%
echo.
node -v
npm -v
echo.
pause
goto menu

:end
endlocal
exit /b 0
