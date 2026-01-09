# PowerShell script to run Next.js dev server on an available port between 3001-3008
# Usage: .\run-dev.ps1

$ports = 3001..3008
$availablePort = $null
foreach ($p in $ports) {
    $inUse = netstat -ano | Select-String ":$p "
    if (-not $inUse) {
        $availablePort = $p
        break
    }
}
if (-not $availablePort) {
    Write-Host "No free port found in range 3001-3008. Exiting."
    exit 1
}
Write-Host "Starting Next.js dev server on port $availablePort..."
$env:PORT = $availablePort
npm run dev
