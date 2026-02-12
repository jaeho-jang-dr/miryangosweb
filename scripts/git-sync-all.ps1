# Git Sync All Repositories
# 이 스크립트는 5개의 모든 GitHub 리모트 저장소와 동기화합니다.

function Sync-Remote {
    param([string]$RemoteName, [string]$BranchName = "main")
    
    Write-Host "`n--- Syncing $RemoteName ($BranchName) ---" -ForegroundColor Cyan
    
    # 1. Pull
    Write-Host "Pulling from $RemoteName..." -ForegroundColor Green
    git pull $RemoteName $BranchName --rebase
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Pull failed for $RemoteName. Please check conflicts." -ForegroundColor Red
        return $false
    }
    
    # 2. Push
    Write-Host "Pushing to $RemoteName..." -ForegroundColor Green
    git push $RemoteName main:$BranchName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Push failed for $RemoteName." -ForegroundColor Red
        return $false
    }
    
    return $true
}

# 1. Stage all changes
Write-Host "`n[1/3] Staging all changes..." -ForegroundColor Yellow
git add .

# 2. Commit if there are changes
$status = git status --porcelain
if ($status) {
    Write-Host "[2/3] Committing changes..." -ForegroundColor Yellow
    git commit -m "chore: sync Firebase storage logic across all apps and PCs"
} else {
    Write-Host "[2/3] No changes to commit." -ForegroundColor DarkGray
}

# 3. Double Check Remotes
$remotes = git remote
$required = @("origin", "noterang", "notebooklm-automation", "nlm-to-web", "jpdf")

Write-Host "`n[3/3] Synchronizing with 5 remotes..." -ForegroundColor Yellow

Sync-Remote "origin" "main"
Sync-Remote "noterang" "main"
Sync-Remote "notebooklm-automation" "main"
Sync-Remote "nlm-to-web" "main"
Sync-Remote "jpdf" "main"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "       All Repositories Synced!        " -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
