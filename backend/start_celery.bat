@echo off
echo Starting Celery Backend System...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if requirements are installed
echo Checking Python dependencies...
pip show celery >nul 2>&1
if errorlevel 1 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo Error: Failed to install Python dependencies
        pause
        exit /b 1
    )
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Node.js dependencies are installed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
    if errorlevel 1 (
        echo Error: Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting Celery system...
echo Press Ctrl+C to stop
echo.

REM Start the Celery system
python start_celery.py

pause 