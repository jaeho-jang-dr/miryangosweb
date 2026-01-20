---
description: Restore the Antigravity Claude Environment (Proxy + CLI)
---
# Restore Claude Environment

This workflow restores the "Antigravity + Claude" development environment. It ensures the local proxy is running and launches the Claude CLI.

## Usage

Simply run the batch script created for this purpose:

```powershell
.\scripts\start_claude.bat
```

## What this script does

1. **Checks for Proxy**: Looks for a listener on port `8080`.
2. **Auto-Start**: If not found, starts `antigravity-claude-proxy` in a minimized background window.
3. **Health Check**: Waits until `http://localhost:8080/v1/models` is responsive.
4. **Launch Claude**: Sets environment variables (`ANTHROPIC_BASE_URL`) and launches the `claude` CLI.

## Manual Steps (if script fails)

1. Open a terminal.
2. Navigate to proxy: `cd antigravity-claude-proxy`
3. Run: `npm start`
4. In a new terminal, run: `claude`
