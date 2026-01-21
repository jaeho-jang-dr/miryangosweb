@echo off
setlocal
chcp 65001 > nul
echo ==========================================
echo       Global Agent System Setup
echo       (글로벌 에이전트 시스템 설정)
echo ==========================================

set "SOURCE_DIR=%~dp0_CommonAgents_Export"
set "PARENT_DIR=%~dp0.."
set "GLOBAL_DIR=%PARENT_DIR%\_CommonAgents"

echo Source (원본): %SOURCE_DIR%
echo Target (대상): %GLOBAL_DIR%

if not exist "%SOURCE_DIR%" (
    echo [ERROR] Export folder not found. Please run this script from the project root.
    echo [오류] 내보내기 폴더를 찾을 수 없습니다. 프로젝트 루트에서 스크립트를 실행해 주세요.
    pause
    exit /b 1
)

if not exist "%GLOBAL_DIR%" (
    echo [INFO] Creating global directory...
    echo [정보] 글로벌 디렉토리 생성 중...
    mkdir "%GLOBAL_DIR%"
)

echo [INFO] Copying agent files...
echo [정보] 에이전트 파일 복사 중...
xcopy /E /I /Y "%SOURCE_DIR%\src" "%GLOBAL_DIR%\src" > nul
xcopy /E /I /Y "%SOURCE_DIR%\.agent" "%GLOBAL_DIR%\.agent" > nul

echo.
echo [SUCCESS] Agents have been installed globally!
echo [성공] 에이전트가 글로벌 환경에 설치되었습니다!
echo Location (위치): %GLOBAL_DIR%
echo.
echo To use in another project (다른 프로젝트에서 사용 방법):
echo 1. Copy '%GLOBAL_DIR%\src\agents' to 'your-project\src\agents'
echo 2. Copy '%GLOBAL_DIR%\.agent' to 'your-project\.agent'
echo.
echo 1. '%GLOBAL_DIR%\src\agents'를 '내프로젝트\src\agents'로 복사하세요.
echo 2. '%GLOBAL_DIR%\.agent'를 '내프로젝트\.agent'로 복사하세요.
echo.
pause
