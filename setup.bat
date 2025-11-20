@echo off
REM Forumyzer Setup and Verification Script
REM Installs dependencies and checks all packages for both backend and webapp

echo.
echo ========================================
echo  FORUMYZER SETUP SCRIPT
echo ========================================
echo.

REM Check if we're in the root directory
if not exist backend\ (
    echo ERROR: backend folder not found. Run this from the FORUMYZER root directory.
    exit /b 1
)

if not exist webapp\ (
    echo ERROR: webapp folder not found. Run this from the FORUMYZER root directory.
    exit /b 1
)

REM ========================================
REM BACKEND SETUP
REM ========================================
echo.
echo [1/4] Installing backend dependencies...
cd backend
echo Installing npm packages in backend...
call npm install

echo.
echo [2/4] Checking backend packages...
echo Checking key backend packages:
call npm list express axios cors dotenv uuid validator
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Some backend packages may be missing. Re-running npm install...
    call npm install
)

REM ========================================
REM WEBAPP SETUP
REM ========================================
cd ..
echo.
echo [3/4] Installing webapp dependencies...
cd webapp
echo Installing npm packages in webapp...
call npm install

echo.
echo [4/4] Checking webapp packages...
echo Checking key webapp packages:
call npm list react react-dom dompurify typescript vite
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Some webapp packages may be missing. Re-running npm install...
    call npm install
)

REM ========================================
REM VERIFICATION COMPLETE
REM ========================================
cd ..
echo.
echo ========================================
echo  SETUP COMPLETE
echo ========================================
echo.
echo To start the application:
echo.
echo Terminal 1 (Backend):
echo   cd backend
echo   npm run dev
echo.
echo Terminal 2 (Frontend):
echo   cd webapp
echo   npm run dev
echo.
echo Backend will run on: http://localhost:3000
echo Frontend will run on: http://localhost:5173
echo.
pause
