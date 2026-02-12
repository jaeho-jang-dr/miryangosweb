# Multi-Repository Management Script
# miryangosweb + notebooklm-automation 동시 관리

param(
    [Parameter(Position=0)]
    [ValidateSet("status", "pull", "push", "sync", "help")]
    [string]$Command = "help",

    [Parameter(Position=1)]
    [ValidateSet("all", "web", "nlm")]
    [string]$Target = "all"
)

$ROOT_DIR = Split-Path -Parent $PSScriptRoot
$WEB_REPO = $ROOT_DIR
$NLM_REPO = Join-Path $ROOT_DIR "apps\notebooklm-automation"

function Show-Help {
    Write-Host "`n=== Multi-Repository Manager ===" -ForegroundColor Cyan
    Write-Host "Usage: .\multi-repo.ps1 <command> [target]"
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  status  - Show git status of repositories"
    Write-Host "  pull    - Pull latest changes"
    Write-Host "  push    - Push local changes"
    Write-Host "  sync    - Pull then push (sync both ways)"
    Write-Host "  help    - Show this help"
    Write-Host ""
    Write-Host "Targets:" -ForegroundColor Yellow
    Write-Host "  all     - Both repositories (default)"
    Write-Host "  web    - miryangosweb only"
    Write-Host "  nlm     - notebooklm-automation only"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\multi-repo.ps1 status"
    Write-Host "  .\multi-repo.ps1 pull all"
    Write-Host "  .\multi-repo.ps1 push nlm"
    Write-Host ""
}

function Run-GitCommand {
    param([string]$RepoPath, [string]$RepoName, [string]$GitCommand)

    Write-Host "`n[$RepoName]" -ForegroundColor Cyan
    Write-Host "Path: $RepoPath" -ForegroundColor DarkGray

    Push-Location $RepoPath
    try {
        Invoke-Expression "git $GitCommand"
    } finally {
        Pop-Location
    }
}

function Execute-Command {
    param([string]$GitCmd)

    if ($Target -eq "all" -or $Target -eq "web") {
        Run-GitCommand -RepoPath $WEB_REPO -RepoName "miryangosweb" -GitCommand $GitCmd
    }

    if ($Target -eq "all" -or $Target -eq "nlm") {
        if (Test-Path $NLM_REPO) {
            Run-GitCommand -RepoPath $NLM_REPO -RepoName "notebooklm-automation" -GitCommand $GitCmd
        } else {
            Write-Host "`n[notebooklm-automation] Not found at: $NLM_REPO" -ForegroundColor Red
        }
    }
}

switch ($Command) {
    "status" { Execute-Command "status" }
    "pull"   { Execute-Command "pull" }
    "push"   { Execute-Command "push" }
    "sync"   {
        Write-Host "=== Pulling ===" -ForegroundColor Green
        Execute-Command "pull"
        Write-Host "`n=== Pushing ===" -ForegroundColor Green
        Execute-Command "push"
    }
    "help"   { Show-Help }
    default  { Show-Help }
}
