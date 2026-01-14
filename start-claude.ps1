# Claude CLI Quick Launcher
# PowerShell script to launch Claude with project context

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Miryang Orthopedic - Claude CLI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project directory
$projectPath = "D:\Entertainments\DevEnvironment\miryangosweb"
Set-Location $projectPath
Write-Host "[1/4] Changed to project directory" -ForegroundColor Green
Write-Host "      $projectPath" -ForegroundColor Gray

# Check if antigravity-claude-proxy is running
Write-Host "[2/4] Checking antigravity-claude-proxy..." -ForegroundColor Green
$proxyRunning = Get-NetTCPConnection -LocalPort 9097 -ErrorAction SilentlyContinue

if ($proxyRunning) {
    Write-Host "      Proxy already running on port 9097" -ForegroundColor Gray
} else {
    Write-Host "      Starting antigravity-claude-proxy..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd" -ArgumentList "/k antigravity-claude-proxy" -WindowStyle Normal
    Start-Sleep -Seconds 3
    Write-Host "      Proxy started successfully" -ForegroundColor Green
}

# Verify environment
Write-Host "[3/4] Verifying environment..." -ForegroundColor Green
if ([string]::IsNullOrEmpty($env:ANTHROPIC_API_KEY)) {
    Write-Host "      WARNING: ANTHROPIC_API_KEY not set" -ForegroundColor Red
    Write-Host "      Please set it in your environment variables" -ForegroundColor Yellow
} else {
    Write-Host "      ANTHROPIC_API_KEY is set" -ForegroundColor Gray
}

# Start Claude CLI
Write-Host "[4/4] Starting Claude CLI..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Claude CLI Ready" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project: Miryang Orthopedic Web" -ForegroundColor White
Write-Host "Path: $projectPath" -ForegroundColor Gray
Write-Host "Proxy: http://localhost:9097" -ForegroundColor Gray
Write-Host ""
Write-Host "Starting Claude..." -ForegroundColor Green
Write-Host ""

# Launch Claude
& claude
