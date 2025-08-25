@echo off
echo ======================================
echo    Supabase Auth Integration Tests
echo ======================================
echo.

echo [1/4] Checking if Encore server is running...
curl -s http://localhost:4000 > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Encore server is not running on localhost:4000
    echo Please start the server with: cd backend && encore run
    pause
    exit /b 1
)
echo ✅ Encore server is accessible

echo.
echo [2/4] Running environment setup verification tests...
npx playwright test tests/auth-setup.spec.ts --reporter=list
if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Setup verification found issues. Check the output above.
    echo You may continue with the main tests, but some may fail.
    echo.
    pause
)

echo.
echo [3/4] Running comprehensive authentication integration tests...
npx playwright test tests/auth-integration.spec.ts --reporter=list --timeout=60000
if %errorlevel% neq 0 (
    echo.
    echo ❌ Some authentication tests failed. Check the output above.
    echo.
    goto show_report
)

echo.
echo [4/4] Generating detailed HTML report...
npx playwright show-report test-results/html-report
goto end

:show_report
echo.
echo 📊 Generating test report...
npx playwright show-report test-results/html-report
echo.
echo Check the test report for detailed failure information.

:end
echo.
echo ✅ Authentication testing complete!
echo.
pause