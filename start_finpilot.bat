@echo off
call venv\Scripts\activate.bat
uvicorn python.main:app --reload --port 8000
pause