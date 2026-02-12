# smart-sync.ps1 - 변경 감지 기반 스마트 Git 동기화
# 메인 repo + subtree 앱을 변경된 것만 골라서 push/pull
#
# 사용법:
#   .\smart-sync.ps1 status              변경 현황 대시보드
#   .\smart-sync.ps1 push                변경된 것만 push
#   .\smart-sync.ps1 push -All           전부 push
#   .\smart-sync.ps1 push -App noterang  특정 앱만 push
#   .\smart-sync.ps1 pull                전체 pull
#   .\smart-sync.ps1 pull -App jpdf      특정 앱만 pull
#   .\smart-sync.ps1 sync                pull 후 push
#   .\smart-sync.ps1 setup               remote 설정 확인/추가
#   .\smart-sync.ps1 push -DryRun        실행 안 하고 미리보기

param(
    [Parameter(Position = 0)]
    [ValidateSet("status", "push", "pull", "sync", "setup", "help")]
    [string]$Command = "help",

    [string]$App = "",
    [switch]$All,
    [switch]$DryRun,
    [switch]$MainOnly,
    [switch]$AppsOnly,
    [switch]$Force
)

$ErrorActionPreference = "Continue"

# ============================================================
# 설정
# ============================================================
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $PROJECT_ROOT

$GITHUB_USER = "jaeho-jang-dr"

# 앱 매핑: 로컬폴더 → (remote이름, GitHub리포이름)
$APPS = [ordered]@{
    "notebooklm-automation" = @{ Remote = "notebook-auto"; Repo = "notebooklm-automation" }
    "noterang"              = @{ Remote = "noterang";      Repo = "noterang" }
    "jpdf"                  = @{ Remote = "jpdf";          Repo = "jpdf" }
    "nlm_to_web"            = @{ Remote = "nlm-to-web";    Repo = "nlm-to-web" }
}

# ============================================================
# 유틸리티 함수
# ============================================================
function Write-Header {
    param([string]$Text)
    $line = "=" * 50
    Write-Host ""
    Write-Host "  $line" -ForegroundColor DarkCyan
    Write-Host "   $Text" -ForegroundColor Cyan
    Write-Host "  $line" -ForegroundColor DarkCyan
}

function Write-Status {
    param([string]$Icon, [string]$Label, [string]$Message, [string]$Color = "White")
    Write-Host "  $Icon " -NoNewline -ForegroundColor $Color
    Write-Host "$Label" -NoNewline -ForegroundColor White
    Write-Host " $Message" -ForegroundColor DarkGray
}

function Write-Action {
    param([string]$Label, [string]$Detail, [switch]$Success, [switch]$Fail, [switch]$Skip)
    if ($Success) {
        Write-Host "  [OK] " -NoNewline -ForegroundColor Green
    } elseif ($Fail) {
        Write-Host "  [!!] " -NoNewline -ForegroundColor Red
    } elseif ($Skip) {
        Write-Host "  [--] " -NoNewline -ForegroundColor DarkGray
    } else {
        Write-Host "  [..] " -NoNewline -ForegroundColor Yellow
    }
    Write-Host "$Label " -NoNewline -ForegroundColor White
    Write-Host "$Detail" -ForegroundColor DarkGray
}

# ============================================================
# 변경 감지
# ============================================================
function Get-ChangedApps {
    # staged + unstaged 변경 파일
    $workingChanges = git diff --name-only HEAD 2>$null
    $stagedChanges = git diff --name-only --cached 2>$null
    # 아직 push 안 한 커밋의 변경 파일
    $unpushedChanges = git diff --name-only origin/main..HEAD 2>$null
    # untracked 파일
    $untrackedFiles = git ls-files --others --exclude-standard 2>$null

    $allChanges = @()
    if ($workingChanges)  { $allChanges += $workingChanges }
    if ($stagedChanges)   { $allChanges += $stagedChanges }
    if ($unpushedChanges) { $allChanges += $unpushedChanges }
    if ($untrackedFiles)  { $allChanges += $untrackedFiles }
    $allChanges = $allChanges | Sort-Object -Unique

    $result = @{
        MainChanged  = $false
        MainFiles    = @()
        Apps         = @{}
        TotalChanged = $allChanges.Count
    }

    foreach ($appName in $APPS.Keys) {
        $prefix = "apps/$appName/"
        $appFiles = $allChanges | Where-Object { $_ -like "$prefix*" }
        $result.Apps[$appName] = @{
            Changed = ($appFiles.Count -gt 0)
            Files   = @($appFiles)
            Count   = $appFiles.Count
        }
    }

    # apps/ 밖의 파일 = 메인 앱 변경
    $mainFiles = $allChanges | Where-Object {
        $isApp = $false
        foreach ($appName in $APPS.Keys) {
            if ($_ -like "apps/$appName/*") { $isApp = $true; break }
        }
        -not $isApp
    }
    $result.MainChanged = ($mainFiles.Count -gt 0)
    $result.MainFiles = @($mainFiles)

    return $result
}

function Get-UnpushedCommitCount {
    $count = git rev-list --count origin/main..HEAD 2>$null
    if ($LASTEXITCODE -ne 0) { return 0 }
    return [int]$count
}

# ============================================================
# Remote 설정
# ============================================================
function Ensure-Remotes {
    $existingRemotes = git remote 2>$null
    $added = 0

    foreach ($appName in $APPS.Keys) {
        $info = $APPS[$appName]
        $remoteName = $info.Remote
        $repoName = $info.Repo
        $url = "https://github.com/$GITHUB_USER/$repoName.git"

        if ($existingRemotes -notcontains $remoteName) {
            if (-not $DryRun) {
                git remote add $remoteName $url 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Action -Label "remote 추가: $remoteName" -Detail $url -Success
                    $added++
                } else {
                    Write-Action -Label "remote 추가 실패: $remoteName" -Detail $url -Fail
                }
            } else {
                Write-Action -Label "remote 추가 예정: $remoteName" -Detail $url
            }
        }
    }
    return $added
}

function Show-Remotes {
    Write-Host ""
    Write-Host "  Remote 설정:" -ForegroundColor Yellow
    $existingRemotes = git remote 2>$null

    # 메인
    $originUrl = git remote get-url origin 2>$null
    Write-Status -Icon "[M]" -Label "origin" -Message $originUrl -Color Green

    foreach ($appName in $APPS.Keys) {
        $info = $APPS[$appName]
        $remoteName = $info.Remote
        if ($existingRemotes -contains $remoteName) {
            $url = git remote get-url $remoteName 2>$null
            Write-Status -Icon "[A]" -Label $remoteName -Message $url -Color Green
        } else {
            $url = "https://github.com/$GITHUB_USER/$($info.Repo).git"
            Write-Status -Icon "[X]" -Label $remoteName -Message "$url (미설정)" -Color Red
        }
    }
}

# ============================================================
# STATUS 명령
# ============================================================
function Show-Status {
    Write-Header "Smart Sync Status"

    # remote 확인
    Show-Remotes

    # 변경 감지
    $changes = Get-ChangedApps
    $unpushed = Get-UnpushedCommitCount

    Write-Host ""
    Write-Host "  Push 대기 커밋: " -NoNewline -ForegroundColor Yellow
    if ($unpushed -gt 0) {
        Write-Host "$unpushed 개" -ForegroundColor Red
    } else {
        Write-Host "없음" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "  변경 현황:" -ForegroundColor Yellow

    # 메인 앱
    if ($changes.MainChanged) {
        Write-Host "  [M] " -NoNewline -ForegroundColor Red
        Write-Host "miryangosweb (메인)" -NoNewline -ForegroundColor White
        Write-Host "  $($changes.MainFiles.Count)개 파일" -ForegroundColor Yellow
        foreach ($f in ($changes.MainFiles | Select-Object -First 5)) {
            Write-Host "      $f" -ForegroundColor DarkGray
        }
        if ($changes.MainFiles.Count -gt 5) {
            Write-Host "      ... 외 $($changes.MainFiles.Count - 5)개" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  [M] " -NoNewline -ForegroundColor Green
        Write-Host "miryangosweb (메인)" -NoNewline -ForegroundColor White
        Write-Host "  변경 없음" -ForegroundColor DarkGray
    }

    # 앱들
    foreach ($appName in $APPS.Keys) {
        $appInfo = $changes.Apps[$appName]
        $remoteName = $APPS[$appName].Remote
        if ($appInfo.Changed) {
            Write-Host "  [A] " -NoNewline -ForegroundColor Red
            Write-Host "apps/$appName" -NoNewline -ForegroundColor White
            Write-Host "  $($appInfo.Count)개 파일" -NoNewline -ForegroundColor Yellow
            Write-Host "  -> $remoteName" -ForegroundColor DarkCyan
            foreach ($f in ($appInfo.Files | Select-Object -First 3)) {
                $shortPath = $f -replace "^apps/$appName/", ""
                Write-Host "      $shortPath" -ForegroundColor DarkGray
            }
            if ($appInfo.Count -gt 3) {
                Write-Host "      ... 외 $($appInfo.Count - 3)개" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "  [A] " -NoNewline -ForegroundColor Green
            Write-Host "apps/$appName" -NoNewline -ForegroundColor DarkGray
            Write-Host "  변경 없음" -ForegroundColor DarkGray
        }
    }

    # 요약
    $changedApps = ($changes.Apps.Values | Where-Object { $_.Changed }).Count
    $totalTargets = $changedApps + [int]$changes.MainChanged
    Write-Host ""
    if ($totalTargets -gt 0) {
        Write-Host "  Push 필요: $totalTargets 개 대상" -ForegroundColor Yellow
        Write-Host "  실행: " -NoNewline -ForegroundColor DarkGray
        Write-Host ".\smart-sync.ps1 push" -ForegroundColor Cyan
    } else {
        Write-Host "  모두 최신 상태입니다!" -ForegroundColor Green
    }
    Write-Host ""
}

# ============================================================
# PUSH 명령
# ============================================================
function Do-Push {
    Write-Header "Smart Push"

    # remote 확인 및 자동 추가
    $added = Ensure-Remotes
    if ($added -gt 0) { Write-Host "" }

    $changes = Get-ChangedApps

    # 특정 앱만 대상
    if ($App) {
        if ($APPS.ContainsKey($App)) {
            Push-SingleApp -AppName $App
        } elseif ($App -eq "main") {
            Push-Main
        } else {
            Write-Host "  [!!] 앱 '$App' 을 찾을 수 없습니다." -ForegroundColor Red
            Write-Host "  사용 가능: main, $($APPS.Keys -join ', ')" -ForegroundColor DarkGray
        }
        return
    }

    $pushed = 0

    # 메인 repo push
    if (-not $AppsOnly) {
        if ($changes.MainChanged -or $All -or (Get-UnpushedCommitCount) -gt 0) {
            Push-Main
            $pushed++
        } else {
            Write-Action -Label "miryangosweb (메인)" -Detail "변경 없음 - 건너뜀" -Skip
        }
    }

    # 앱별 subtree push
    if (-not $MainOnly) {
        foreach ($appName in $APPS.Keys) {
            $appInfo = $changes.Apps[$appName]
            if ($appInfo.Changed -or $All) {
                Push-SingleApp -AppName $appName
                $pushed++
            } else {
                $remoteName = $APPS[$appName].Remote
                Write-Action -Label "apps/$appName" -Detail "변경 없음 - 건너뜀" -Skip
            }
        }
    }

    Write-Host ""
    if ($pushed -gt 0) {
        Write-Host "  Push 완료: $pushed 개 대상" -ForegroundColor Green
    } else {
        Write-Host "  Push 할 변경사항이 없습니다." -ForegroundColor DarkGray
    }
    Write-Host ""
}

function Push-Main {
    Write-Host ""
    Write-Host "  [M] miryangosweb -> origin/main" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Action -Label "DRY RUN" -Detail "git push origin main"
        return
    }
    git push origin main 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -eq 0) {
        Write-Action -Label "origin push" -Detail "완료" -Success
    } else {
        Write-Action -Label "origin push" -Detail "실패" -Fail
    }
}

function Push-SingleApp {
    param([string]$AppName)
    $info = $APPS[$AppName]
    $remoteName = $info.Remote
    $repoName = $info.Repo

    Write-Host ""
    Write-Host "  [A] apps/$AppName -> $remoteName/main" -ForegroundColor Cyan

    # remote 존재 확인
    $existingRemotes = git remote 2>$null
    if ($existingRemotes -notcontains $remoteName) {
        $url = "https://github.com/$GITHUB_USER/$repoName.git"
        git remote add $remoteName $url 2>$null
        Write-Action -Label "remote 자동 추가" -Detail "$remoteName = $url"
    }

    if ($DryRun) {
        Write-Action -Label "DRY RUN" -Detail "git subtree push --prefix=apps/$AppName $remoteName main"
        return
    }

    Write-Host "      subtree push 진행중..." -ForegroundColor DarkGray
    git subtree push --prefix="apps/$AppName" $remoteName main 2>&1 | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Action -Label "$remoteName push" -Detail "완료" -Success
    } else {
        Write-Action -Label "$remoteName push" -Detail "실패 - git subtree split 시간이 걸릴 수 있습니다" -Fail
    }
}

# ============================================================
# PULL 명령
# ============================================================
function Do-Pull {
    Write-Header "Smart Pull"

    # remote 확인 및 자동 추가
    $added = Ensure-Remotes
    if ($added -gt 0) { Write-Host "" }

    # 특정 앱만 대상
    if ($App) {
        if ($APPS.ContainsKey($App)) {
            Pull-SingleApp -AppName $App
        } elseif ($App -eq "main") {
            Pull-Main
        } else {
            Write-Host "  [!!] 앱 '$App' 을 찾을 수 없습니다." -ForegroundColor Red
        }
        return
    }

    $pulled = 0

    # 메인 repo pull
    if (-not $AppsOnly) {
        Pull-Main
        $pulled++
    }

    # 앱별 subtree pull
    if (-not $MainOnly) {
        foreach ($appName in $APPS.Keys) {
            if (-not $App -or $App -eq $appName) {
                Pull-SingleApp -AppName $appName
                $pulled++
            }
        }
    }

    Write-Host ""
    Write-Host "  Pull 완료: $pulled 개 대상" -ForegroundColor Green
    Write-Host ""
}

function Pull-Main {
    Write-Host ""
    Write-Host "  [M] origin/main -> miryangosweb" -ForegroundColor Cyan
    if ($DryRun) {
        Write-Action -Label "DRY RUN" -Detail "git pull origin main"
        return
    }
    git pull origin main 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -eq 0) {
        Write-Action -Label "origin pull" -Detail "완료" -Success
    } else {
        Write-Action -Label "origin pull" -Detail "실패" -Fail
    }
}

function Pull-SingleApp {
    param([string]$AppName)
    $info = $APPS[$AppName]
    $remoteName = $info.Remote
    $repoName = $info.Repo

    Write-Host ""
    Write-Host "  [A] $remoteName/main -> apps/$AppName" -ForegroundColor Cyan

    # remote 존재 확인
    $existingRemotes = git remote 2>$null
    if ($existingRemotes -notcontains $remoteName) {
        $url = "https://github.com/$GITHUB_USER/$repoName.git"
        git remote add $remoteName $url 2>$null
        Write-Action -Label "remote 자동 추가" -Detail "$remoteName = $url"
    }

    if ($DryRun) {
        Write-Action -Label "DRY RUN" -Detail "git subtree pull --prefix=apps/$AppName $remoteName main --squash"
        return
    }

    git subtree pull --prefix="apps/$AppName" $remoteName main --squash -m "sync: pull $AppName from $remoteName" 2>&1 | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }
    if ($LASTEXITCODE -eq 0) {
        Write-Action -Label "$remoteName pull" -Detail "완료" -Success
    } else {
        Write-Action -Label "$remoteName pull" -Detail "실패" -Fail
    }
}

# ============================================================
# SYNC 명령
# ============================================================
function Do-Sync {
    Write-Header "Smart Sync (Pull -> Push)"

    Write-Host ""
    Write-Host "  === Phase 1: Pull ===" -ForegroundColor Yellow
    Do-Pull

    Write-Host ""
    Write-Host "  === Phase 2: Push ===" -ForegroundColor Yellow
    Do-Push
}

# ============================================================
# SETUP 명령
# ============================================================
function Do-Setup {
    Write-Header "Remote Setup"

    Show-Remotes

    Write-Host ""
    $added = Ensure-Remotes

    if ($added -gt 0) {
        Write-Host ""
        Write-Host "  $added 개 remote 추가됨" -ForegroundColor Green
        Show-Remotes
    } else {
        Write-Host ""
        Write-Host "  모든 remote이 이미 설정되어 있습니다." -ForegroundColor Green
    }
    Write-Host ""
}

# ============================================================
# HELP 명령
# ============================================================
function Show-Help {
    Write-Host ""
    Write-Host "  smart-sync - 변경 감지 기반 스마트 Git 동기화" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  명령:" -ForegroundColor Yellow
    Write-Host "    status              변경 현황 대시보드"
    Write-Host "    push                변경된 것만 push (스마트)"
    Write-Host "    pull                전체 pull"
    Write-Host "    sync                pull 후 push"
    Write-Host "    setup               remote 설정 확인/추가"
    Write-Host "    help                이 도움말"
    Write-Host ""
    Write-Host "  옵션:" -ForegroundColor Yellow
    Write-Host "    -App <이름>         특정 앱만 대상 (main, noterang, jpdf, ...)"
    Write-Host "    -All                전부 push (변경 없어도)"
    Write-Host "    -DryRun             실행 안 하고 미리보기"
    Write-Host "    -MainOnly           메인 repo만"
    Write-Host "    -AppsOnly           subtree 앱만"
    Write-Host ""
    Write-Host "  예시:" -ForegroundColor Yellow
    Write-Host "    .\smart-sync.ps1 status" -ForegroundColor DarkGray
    Write-Host "    .\smart-sync.ps1 push                  # 변경된 것만" -ForegroundColor DarkGray
    Write-Host "    .\smart-sync.ps1 push -All             # 전부" -ForegroundColor DarkGray
    Write-Host "    .\smart-sync.ps1 push -App noterang    # noterang만" -ForegroundColor DarkGray
    Write-Host "    .\smart-sync.ps1 push -MainOnly        # 메인만" -ForegroundColor DarkGray
    Write-Host "    .\smart-sync.ps1 push -DryRun          # 미리보기" -ForegroundColor DarkGray
    Write-Host "    .\smart-sync.ps1 pull -App jpdf        # jpdf만 pull" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  npm 스크립트:" -ForegroundColor Yellow
    Write-Host "    npm run sync                   status" -ForegroundColor DarkGray
    Write-Host "    npm run sync:push              변경된 것만 push" -ForegroundColor DarkGray
    Write-Host "    npm run sync:pull              전체 pull" -ForegroundColor DarkGray
    Write-Host "    npm run sync:push:all          전부 push" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================
# 메인 실행
# ============================================================

if ($DryRun) {
    Write-Host ""
    Write-Host "  *** DRY RUN 모드 - 실제 실행하지 않습니다 ***" -ForegroundColor Magenta
}

switch ($Command) {
    "status" { Show-Status }
    "push"   { Do-Push }
    "pull"   { Do-Pull }
    "sync"   { Do-Sync }
    "setup"  { Do-Setup }
    "help"   { Show-Help }
    default  { Show-Help }
}
