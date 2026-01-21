# auth_proxy.ps1
# This script launches the Antigravity Proxy authentication flow in a separate window
# to avoid interference from the IDE terminal and ensure browser launching works.

$ProxyCmd = "C:\CleanDev\npm-global\antigravity-claude-proxy.cmd"
$Port = 9099

Write-Host "--- Antigravity Proxy Auth Helper ---" -ForegroundColor Cyan

# 1. Clean up port 9099
Write-Host "Checking port $Port..."
$conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($conn) {
    Write-Host "Stopping process on port $Port (PID: $($conn.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $conn.OwningProcess -Force
}

# 2. Launch in new window
Write-Host "Launching authentication window..." -ForegroundColor Green
Write-Host "1. A new blue PowerShell window will open."
Write-Host "2. It will attempt to open your browser for Google Login."
Write-Host "3. If the browser doesn't open, copy the URL from that window."
Write-Host "4. Complete login and close the window when done."

# We use -NoExit so the window stays open if there's an error, allowing the user to read it.
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT=$Port; & '$ProxyCmd' accounts add"

Write-Host "Done! Check your taskbar for the new window."
