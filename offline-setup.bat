@echo off
echo ========================================
echo StaPOS Offline Setup for Windows
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found! Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo Building production version...
call npm run build

if %errorlevel% neq 0 (
    echo ERROR: Failed to build project!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the offline server, run:
echo   npm run serve
echo.
echo Then access from:
echo   PC: http://localhost:3000
echo   Other devices: http://[YOUR-PC-IP]:3000
echo.
echo To find your PC IP address, run: ipconfig
echo.
pause