# Generate Secure Secrets for Leave Management System
# This script generates cryptographically secure secrets for Auth0 integration

Write-Host "=== LEAVE MANAGEMENT SYSTEM - SECRET GENERATOR ===" -ForegroundColor Magenta
Write-Host ""

# Generate Auth0 Webhook Secret (32 bytes, base64 encoded)
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$webhookBytes = New-Object byte[] 32
$rng.GetBytes($webhookBytes)
$webhookSecret = [System.Convert]::ToBase64String($webhookBytes)

# Generate Admin Init Secret (24 bytes, base64 encoded)
$adminBytes = New-Object byte[] 24
$rng.GetBytes($adminBytes)
$adminSecret = [System.Convert]::ToBase64String($adminBytes)

# Generate Email API Key (if needed)
$emailBytes = New-Object byte[] 16
$rng.GetBytes($emailBytes)
$emailSecret = [System.Convert]::ToBase64String($emailBytes)

Write-Host "1. Auth0 Webhook Secret:" -ForegroundColor Green
Write-Host $webhookSecret -ForegroundColor Yellow
Write-Host ""

Write-Host "2. Admin Init Secret:" -ForegroundColor Green  
Write-Host $adminSecret -ForegroundColor Yellow
Write-Host ""

Write-Host "3. Email API Key (optional):" -ForegroundColor Green
Write-Host $emailSecret -ForegroundColor Yellow
Write-Host ""

Write-Host "=== ENCORE COMMANDS ===" -ForegroundColor Cyan
Write-Host "Copy and run these commands:" -ForegroundColor Gray
Write-Host ""
Write-Host "encore secret set Auth0WebhookSecret $webhookSecret" -ForegroundColor White
Write-Host "encore secret set AdminInitSecret $adminSecret" -ForegroundColor White
Write-Host "encore secret set EmailAPIKey $emailSecret" -ForegroundColor White
Write-Host ""

Write-Host "=== SECURITY NOTES ===" -ForegroundColor Red
Write-Host "• These secrets are cryptographically secure (256-bit entropy)" -ForegroundColor Yellow
Write-Host "• Save them in a secure password manager" -ForegroundColor Yellow  
Write-Host "• Never commit secrets to version control" -ForegroundColor Yellow
Write-Host "• Rotate secrets periodically for enhanced security" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Run the encore secret commands above" -ForegroundColor Gray
Write-Host "2. Configure Auth0 webhook with the webhook secret" -ForegroundColor Gray
Write-Host "3. Create your first admin user using the admin secret" -ForegroundColor Gray
Write-Host "4. See ADMIN_SETUP.md for complete instructions" -ForegroundColor Gray
Write-Host ""

$rng.Dispose()
Write-Host "✅ Secrets generated successfully!" -ForegroundColor Green