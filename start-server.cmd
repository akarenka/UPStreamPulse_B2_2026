@echo off
setlocal
cd /d "%~dp0"
title StreamPulse B2 Local Upload Endpoint
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js 18 or newer from https://nodejs.org/
  pause
  exit /b 1
)
if not exist config.env (
  echo Backblaze credentials are not configured yet.
  call setup-backblaze.cmd
  if errorlevel 1 exit /b 1
)
echo Starting local endpoint...
echo Keep this window open while uploading videos.
echo.
node server.js
echo.
echo Server stopped.
pause
