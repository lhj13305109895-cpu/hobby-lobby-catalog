@echo off
setlocal
cd /d "%~dp0"
set "STUDIO_PREVIEW_PORT=5180"
set "STUDIO_NODE=C:\Users\33865\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%STUDIO_NODE%" (
  echo Node runtime is missing. Please contact Codex to update the launcher.
  pause
  exit /b 1
)
echo Starting Model 322 preview on port 5180...
echo Keep this window open while using the studio.
"%STUDIO_NODE%" scripts\studio-preview.mjs --open
if errorlevel 1 pause
