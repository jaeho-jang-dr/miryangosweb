@echo off
echo [Antigravity] 시스템을 시작합니다...

:: 1. Proxy 서버 시작 (새 창에서 최소화 상태로 실행)
echo [1/2] Antigravity Proxy 서버 연결 중...
start "Antigravity Proxy" /min cmd /c "%~dp0proxy.bat"

:: 2. 서버가 뜰 때까지 대기 (5초)
echo       연결 대기 중 (5초)...
timeout /t 5 >nul

:: 3. Claude CLI 실행
echo [2/2] Claude 실행 중...
echo.
claude
