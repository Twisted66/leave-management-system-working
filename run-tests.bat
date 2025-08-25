@echo off
echo === Leave Management System - Playwright Test Runner ===

echo Checking if backend is running...
curl -s -o nul http://localhost:4000
if %errorlevel% neq 0 (
    echo Backend not running. Please start it first:
    echo   cd backend
    echo   encore run
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

echo Backend is running. Starting smoke tests...
npm run test:smoke

echo.
echo Tests complete! To run different tests:
echo   npm run test          - Run all tests
echo   npm run test:spa      - Run comprehensive SPA tests  
echo   npm run test:headed   - Run tests with browser visible
echo   npm run test:report   - View test report

pause