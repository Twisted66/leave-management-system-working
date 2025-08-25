#!/usr/bin/env pwsh

# PowerShell script to run Playwright tests against staging environment
# Compatible with both Windows PowerShell and PowerShell Core

param(
    [string]$TestType = "all",
    [switch]$Headed = $false,
    [switch]$Debug = $false,
    [string]$Browser = "chromium"
)

Write-Host "🚀 Running Playwright Tests Against STAGING Environment" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: This script must be run from the project root directory" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Install Playwright browsers if needed
Write-Host "🌐 Checking Playwright browsers..." -ForegroundColor Yellow
npx playwright install --with-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Playwright browsers" -ForegroundColor Red
    exit 1
}

# Test staging URL availability
Write-Host "🔍 Testing staging URL availability..." -ForegroundColor Yellow
$stagingUrl = "https://staging-leave-management-system-99ki.encr.app"
try {
    $response = Invoke-WebRequest -Uri $stagingUrl -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Staging deployment is accessible" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Staging returned status code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to reach staging deployment: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "⏳ Waiting 30 seconds for deployment to be ready..." -ForegroundColor Yellow
    Start-Sleep 30
}

# Set up environment variables for staging
$env:NODE_ENV = "staging"
$env:STAGING_URL = $stagingUrl

# Prepare test command
$testCommand = @("npx", "playwright", "test", "--config=playwright.config.staging.ts")

# Add browser selection
$testCommand += "--project=$Browser-staging"

# Add test type filter
switch ($TestType.ToLower()) {
    "smoke" {
        $testCommand += "tests/smoke.spec.ts"
        Write-Host "🧪 Running SMOKE tests against staging..." -ForegroundColor Green
    }
    "auth" {
        $testCommand += "tests/auth-*.spec.ts"
        Write-Host "🔐 Running AUTHENTICATION tests against staging..." -ForegroundColor Green
    }
    "spa" {
        $testCommand += "tests/spa-*.spec.ts"
        Write-Host "🌐 Running SPA tests against staging..." -ForegroundColor Green
    }
    "all" {
        Write-Host "🎯 Running ALL tests against staging..." -ForegroundColor Green
    }
    default {
        $testCommand += "tests/$TestType"
        Write-Host "📋 Running tests matching: $TestType" -ForegroundColor Green
    }
}

# Add headed mode if requested
if ($Headed) {
    $testCommand += "--headed"
    Write-Host "👀 Running in headed mode (browser visible)" -ForegroundColor Blue
}

# Add debug mode if requested
if ($Debug) {
    $testCommand += "--debug"
    Write-Host "🐛 Running in debug mode" -ForegroundColor Blue
}

# Add staging-specific flags
$testCommand += "--timeout=45000"  # 45 second timeout for staging
$testCommand += "--retries=2"     # 2 retries for network issues

Write-Host ""
Write-Host "Executing: $($testCommand -join ' ')" -ForegroundColor Gray
Write-Host ""

# Run the tests
& $testCommand[0] $testCommand[1..($testCommand.Length-1)]
$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan

if ($exitCode -eq 0) {
    Write-Host "✅ All staging tests passed!" -ForegroundColor Green
    Write-Host "📊 View detailed report: npx playwright show-report test-results/staging-html-report" -ForegroundColor Blue
} else {
    Write-Host "❌ Some tests failed (exit code: $exitCode)" -ForegroundColor Red
    Write-Host "🔍 Check the detailed report: npx playwright show-report test-results/staging-html-report" -ForegroundColor Blue
    Write-Host "📋 Or view JSON results: test-results/staging-results.json" -ForegroundColor Blue
}

Write-Host "🌐 Staging URL: $stagingUrl" -ForegroundColor Blue
Write-Host ""

exit $exitCode