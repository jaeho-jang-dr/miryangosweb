@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: ============================================================
::  apps-sync.bat - 앱별 GitHub 저장소 동기화 도구
::
::  사용법:
::    apps-sync push              모든 앱을 각 repo에 push
::    apps-sync push noterang     noterang만 push
::    apps-sync pull              모든 앱을 각 repo에서 pull
::    apps-sync pull jpdf         jpdf만 pull
::    apps-sync status            각 repo 상태 확인
::    apps-sync list              앱 목록 표시
:: ============================================================

set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

:: 앱 매핑 (로컬폴더=remote이름)
set "APP_COUNT=4"
set "APP_1=notebooklm-automation=notebooklm-automation"
set "APP_2=noterang=noterang"
set "APP_3=jpdf=jpdf"
set "APP_4=nlm_to_web=nlm-to-web"

set "ACTION=%~1"
set "TARGET=%~2"

if "%ACTION%"=="" goto :usage
if "%ACTION%"=="push" goto :push
if "%ACTION%"=="pull" goto :pull
if "%ACTION%"=="status" goto :status
if "%ACTION%"=="list" goto :list
goto :usage

:: ============================================================
:push
:: ============================================================
echo.
echo  ==============================
echo   apps-sync PUSH
echo  ==============================

for /L %%i in (1,1,%APP_COUNT%) do (
    for /f "tokens=1,2 delims==" %%a in ("!APP_%%i!") do (
        set "FOLDER=%%a"
        set "REMOTE=%%b"

        if "%TARGET%"=="" (
            call :do_push "%%a" "%%b"
        ) else if "%TARGET%"=="%%a" (
            call :do_push "%%a" "%%b"
        ) else if "%TARGET%"=="%%b" (
            call :do_push "%%a" "%%b"
        )
    )
)
echo.
echo  완료!
goto :end

:do_push
echo.
echo  [%~1] -^> github.com/jaeho-jang-dr/%~2
git subtree push --prefix=apps/%~1 %~2 main
if %errorlevel% neq 0 (
    echo  [오류] %~1 push 실패
) else (
    echo  [성공] %~1 push 완료
)
goto :eof

:: ============================================================
:pull
:: ============================================================
echo.
echo  ==============================
echo   apps-sync PULL
echo  ==============================

for /L %%i in (1,1,%APP_COUNT%) do (
    for /f "tokens=1,2 delims==" %%a in ("!APP_%%i!") do (
        if "%TARGET%"=="" (
            call :do_pull "%%a" "%%b"
        ) else if "%TARGET%"=="%%a" (
            call :do_pull "%%a" "%%b"
        ) else if "%TARGET%"=="%%b" (
            call :do_pull "%%a" "%%b"
        )
    )
)
echo.
echo  완료!
goto :end

:do_pull
echo.
echo  [%~1] ^<- github.com/jaeho-jang-dr/%~2
git subtree pull --prefix=apps/%~1 %~2 main --squash -m "sync: pull %~1 from %~2"
if %errorlevel% neq 0 (
    echo  [오류] %~1 pull 실패
) else (
    echo  [성공] %~1 pull 완료
)
goto :eof

:: ============================================================
:status
:: ============================================================
echo.
echo  ==============================
echo   apps-sync STATUS
echo  ==============================
echo.
echo  앱 폴더               remote 이름              GitHub URL
echo  --------------------  -----------------------  ----------------------------------------

for /L %%i in (1,1,%APP_COUNT%) do (
    for /f "tokens=1,2 delims==" %%a in ("!APP_%%i!") do (
        for /f "tokens=*" %%u in ('git remote get-url %%b 2^>nul') do (
            echo  apps/%%a            %%b            %%u
        )
    )
)

echo.
echo  메인 repo:
git remote get-url origin
echo.

:: 변경 파일 수 표시
for /L %%i in (1,1,%APP_COUNT%) do (
    for /f "tokens=1,2 delims==" %%a in ("!APP_%%i!") do (
        for /f %%c in ('git diff --name-only HEAD -- apps/%%a 2^>nul ^| find /c /v ""') do (
            if %%c gtr 0 (
                echo  [!] apps/%%a: %%c개 파일 변경됨
            )
        )
    )
)

goto :end

:: ============================================================
:list
:: ============================================================
echo.
echo  ==============================
echo   등록된 앱 목록
echo  ==============================
echo.

for /L %%i in (1,1,%APP_COUNT%) do (
    for /f "tokens=1,2 delims==" %%a in ("!APP_%%i!") do (
        echo  %%i. apps/%%a
        echo     remote: %%b
        echo     GitHub: https://github.com/jaeho-jang-dr/%%b
        echo.
    )
)
goto :end

:: ============================================================
:usage
:: ============================================================
echo.
echo  apps-sync - 앱별 GitHub 저장소 동기화 도구
echo.
echo  사용법:
echo    apps-sync push [앱이름]     앱을 각 repo에 push
echo    apps-sync pull [앱이름]     앱을 각 repo에서 pull
echo    apps-sync status            상태 확인
echo    apps-sync list              앱 목록
echo.
echo  예시:
echo    apps-sync push              전체 push
echo    apps-sync push noterang     noterang만 push
echo    apps-sync pull jpdf         jpdf만 pull
echo.

:end
endlocal
