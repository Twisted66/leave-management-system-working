# PowerShell script to run Playwright tests for Leave Management System
# This script ensures the backend is running and executes the tests

param(
    [string]$TestType = "smoke",
    [switch]$Headed = $false,
    [switch]$Debug = $false
)

Write-Host "=== Leave Management System - Playwright Test Runner ===" -ForegroundColor Green

# Check if backend is running
Write-Host "Checking if Encore backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Host "✓ Backend is running on http://localhost:4000" -ForegroundColor Green
} catch {
    Write-Host "⚠ Backend not detected on port 4000" -ForegroundColor Yellow
    Write-Host "Starting backend server..." -ForegroundColor Yellow
    
    # Start the backend in a new process
    Start-Process -FilePath "cmd" -ArgumentList "/c", "cd", "backend", "&&", "encore", "run" -WindowStyle Minimized
    
    Write-Host "Waiting for backend to start (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Check again
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000" -Method GET -TimeoutSec 5 -UseBasicParsing
        Write-Host "✓ Backend started successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start backend. Please start manually with: cd backend && encore run" -ForegroundColor Red
        exit 1
    }
}

# Determine test command
$testCommand = "npm run test"
switch ($TestType.ToLower()) {
    "smoke" { $testCommand = "npm run test:smoke" }
    "spa" { $testCommand = "npm run test:spa" }
    "all" { $testCommand = "npm run test" }
}

if ($Headed) {
    $testCommand += " -- --headed"
}

if ($Debug) {
    $testCommand += " -- --debug"
}

Write-Host "Running tests with command: $testCommand" -ForegroundColor Cyan

# Run the tests
try {
    Invoke-Expression $testCommand
    Write-Host "✓ Tests completed successfully" -ForegroundColor Green
    
    # Offer to show report
    $showReport = Read-Host "Show test report? (y/n)"
    if ($showReport -eq "y" -or $showReport -eq "Y") {
        npm run test:report
    }
} catch {
    Write-Host "❌ Tests failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "=== Test run complete ===" -ForegroundColor Green