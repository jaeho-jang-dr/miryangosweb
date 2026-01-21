# login.ps1
$env:PORT = 9100
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      Antigravity Proxy Login Helper" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. A browser window will open for Google Login."
Write-Host "2. After login, if you see 'This site can't be reached' or 'localhost refused to connect':" -ForegroundColor Red -BackgroundColor Yellow
Write-Host "   THIS IS NORMAL. DO NOT CLOSE THE BROWSER." -ForegroundColor Red -BackgroundColor Yellow
Write-Host "3. COPY the ENTIRE address (URL) from the browser's address bar." -ForegroundColor Green
Write-Host "4. PASTE the URL into this window below." -ForegroundColor Green
Write-Host ""
Write-Host "Starting authentication..."
Write-Host ""

& "C:\CleanDev\npm-global\antigravity-claude-proxy.cmd" accounts add
