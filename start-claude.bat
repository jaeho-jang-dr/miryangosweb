@echo off
REM ===================================
REM Miryang Orthopedic Web - Claude CLI Auto Start
REM ===================================

echo.
echo ========================================
echo  Miryang Orthopedic Web - Claude Setup
echo ========================================
echo.

REM 1. Change to project directory
cd /d "D:\Entertainments\DevEnvironment\miryangosweb"
echo [1/4] Changed to project directory: %CD%

REM 2. Check if antigravity-claude-proxy is running
echo [2/4] Checking antigravity-claude-proxy...
netstat -ano | findstr ":9097" >nul
if %errorlevel%==0 (
    echo       Proxy already running on port 9097
) else (
    echo       Starting antigravity-claude-proxy on port 9097...
    start "Antigravity Claude Proxy" cmd /k "antigravity-claude-proxy"
    timeout /t 3 /nobreak >nul
    echo       Proxy started successfully
)

REM 3. Verify environment
echo [3/4] Verifying environment...
if not defined ANTHROPIC_API_KEY (
    echo       WARNING: ANTHROPIC_API_KEY not set
    echo       Please set it in your environment variables
) else (
    echo       ANTHROPIC_API_KEY is set
)

REM 4. Start Claude CLI
echo [4/4] Starting Claude CLI...
echo.
echo ========================================
echo  Claude CLI Ready
echo ========================================
echo.
echo Project: Miryang Orthopedic Web
echo Path: D:\Entertainments\DevEnvironment\miryangosweb
echo Proxy: http://localhost:9097
echo.
echo Starting Claude...
echo.

REM Start Claude CLI
claude

REM When Claude exits, keep window open
pause
