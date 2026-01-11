@echo off
echo Setting up Delta Detection Microservice...

REM Create virtual environment if not exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create models directory
if not exist "models" mkdir models

echo.
echo Setup complete! Run 'start.bat' to start the service.
pause
