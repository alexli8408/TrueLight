@echo off
echo Starting Delta Detection Service...

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start the service
python main.py
