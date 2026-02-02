@echo off
title FlowY Construction Management
echo.
echo ========================================================
echo   FlowY Construction Management - Startet...
echo ========================================================
echo.

cd /d "%~dp0"

IF NOT EXIST "node_modules\" (
    echo [FEHLER] node_modules nicht gefunden!
    echo Bitte fuehren Sie 'npm install' aus, bevor Sie die Anwendung starten.
    echo.
    pause
    exit /b
)

echo Bitte warten, die Anwendung wird geladen...
echo.

REM Starte die App über Electron
call npm run electron-dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo [FEHLER] Die Anwendung konnte nicht gestartet werden.
    pause
)
