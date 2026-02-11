@echo off
setlocal

:: Define paths
set "PROJECT_ROOT=%~dp0.."
set "PROXY_DIR=%PROJECT_ROOT%\antigravity-claude-proxy"

:: Check if Proxy is running on port 8080
netstat -an | find "8080" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [INFO] Antigravity Proxy is already running on port 8080.
) else (
    echo [INFO] Starting Antigravity Proxy...
    cd /d "%PROXY_DIR%"
    :: Start in a new minimized window so it persists and doesn't clutter this shell
    start "Antigravity Proxy" /min npm start
    
    :: Wait for valid response from proxy
    echo [INFO] Waiting for proxy to initialize...
    :wait_loop
    timeout /t 2 /nobreak >nul
    curl -s http://localhost:8080/v1/models >nul 2>&1
    if errorlevel 1 (
        echo ...waiting for proxy...
        goto wait_loop
    )
    echo [SUCCESS] Proxy is up and running!
)

:: Return to project root
cd /d "%PROJECT_ROOT%"

:: Ensure environment variables are set (redundancy for safety)
set "ANTHROPIC_BASE_URL=http://localhost:8080"
set "ANTHROPIC_AUTH_TOKEN=test"

:: Start Claude Code
echo [INFO] Starting Claude Code...
claude --dangerously-skip-permissions --model opus

endlocal
