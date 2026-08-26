@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title StreamPulse Backblaze B2 Setup
echo.
echo ======================================================
echo   StreamPulse - Backblaze B2 local endpoint setup
echo ======================================================
echo.
echo Create a Backblaze Application Key restricted to bucket:
echo streampulse-videos-2026
echo Required capability: writeFiles
echo.
set /p "B2_KEY_ID=Enter keyID: "
set /p "B2_APPLICATION_KEY=Enter applicationKey: "
if not defined B2_KEY_ID goto missing
if not defined B2_APPLICATION_KEY goto missing
(
  echo B2_KEY_ID=%B2_KEY_ID%
  echo B2_APPLICATION_KEY=%B2_APPLICATION_KEY%
  echo B2_BUCKET_ID=6b0bfe4dcd55004aa6050a17
  echo B2_BUCKET_NAME=streampulse-videos-2026
  echo PORT=8787
) > config.env
echo.
echo Configuration saved locally to config.env.
echo Do not upload or share config.env.
echo.
pause
exit /b 0
:missing
echo.
echo keyID and applicationKey are required. Nothing was saved.
pause
exit /b 1
