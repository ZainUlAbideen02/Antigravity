@echo off
if not exist build mkdir build
set PATH=C:\msys64\mingw64\bin;%PATH%
g++ -std=c++17 -I backend/include backend/src/main.cpp backend/src/server.cpp backend/src/router.cpp -o build/server.exe -lws2_32
echo Build complete.
