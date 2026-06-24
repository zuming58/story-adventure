@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo AI Story Adventure - Local Server
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist package.json (
  echo package.json was not found. Please run this file from the project root.
  pause
  exit /b 1
)

echo Starting local server...
echo Open this URL after the server starts:
echo http://localhost:3100
echo.

npm.cmd run dev

pause
