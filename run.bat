@echo off
set PATH=C:\msys64\mingw64\bin;%PATH%
echo Starting Backend Server...
start build\server.exe
echo Backend started. Open frontend/index.html in your browser.
pause
