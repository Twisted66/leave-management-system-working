#!/usr/bin/env pwsh

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "    Supabase Auth Integration Tests" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Checking if Encore server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Encore server is accessible" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Encore server is not running on localhost:4000" -ForegroundColor Red
    Write-Host "Please start the server with: cd backend && encore run" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Running environment setup verification tests..." -ForegroundColor Yellow
$setupResult = & npx playwright test tests/auth-setup.spec.ts --reporter=list
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️ Setup verification found issues. Check the output above." -ForegroundColor Yellow
    Write-Host "You may continue with the main tests, but some may fail." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to continue with main tests"
}

Write-Host ""
Write-Host "[3/4] Running comprehensive authentication integration tests..." -ForegroundColor Yellow
$testResult = & npx playwright test tests/auth-integration.spec.ts --reporter=list --timeout=60000
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Some authentication tests failed. Check the output above." -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Write-Host "[4/4] Generating detailed HTML report..." -ForegroundColor Yellow
& npx playwright show-report test-results/html-report

if ($testResult -eq 0) {
    Write-Host ""
    Write-Host "✅ All authentication tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Some tests failed. Check the HTML report for detailed information." -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host "- Environment setup verification: tests/auth-setup.spec.ts" -ForegroundColor White
Write-Host "- Authentication integration tests: tests/auth-integration.spec.ts" -ForegroundColor White
Write-Host "- HTML report available in: test-results/html-report" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"