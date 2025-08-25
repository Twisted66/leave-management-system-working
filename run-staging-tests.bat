@echo off
REM Batch script to run Playwright tests against staging environment

echo 🚀 Running Playwright Tests Against STAGING Environment
echo ============================================================

REM Check if we're in the right directory
if not exist package.json (
    echo ❌ Error: This script must be run from the project root directory
    exit /b 1
)

REM Set environment variables
set NODE_ENV=staging
set STAGING_URL=https://staging-leave-management-system-99ki.encr.app

REM Check dependencies
echo 📦 Checking dependencies...
if not exist node_modules (
    echo Installing npm dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        exit /b 1
    )
)

REM Install Playwright browsers
echo 🌐 Installing Playwright browsers...
npx playwright install --with-deps
if errorlevel 1 (
    echo ❌ Failed to install Playwright browsers
    exit /b 1
)

REM Test staging URL availability
echo 🔍 Testing staging URL availability...
curl -s -w "%%{http_code}" %STAGING_URL%/ > nul
if errorlevel 1 (
    echo ⚠️ Failed to reach staging deployment, waiting 30 seconds...
    timeout /t 30 /nobreak > nul
)

echo ✅ Starting tests against staging deployment...
echo.

REM Run all tests against staging
npx playwright test --config=playwright.config.staging.ts --timeout=45000 --retries=2
set TEST_EXIT_CODE=%errorlevel%

echo.
echo ============================================================

if %TEST_EXIT_CODE% equ 0 (
    echo ✅ All staging tests passed!
    echo 📊 View detailed report: npx playwright show-report test-results/staging-html-report
) else (
    echo ❌ Some tests failed (exit code: %TEST_EXIT_CODE%)
    echo 🔍 Check the detailed report: npx playwright show-report test-results/staging-html-report
    echo 📋 Or view JSON results: test-results/staging-results.json
)

echo 🌐 Staging URL: %STAGING_URL%
echo.

exit /b %TEST_EXIT_CODE%