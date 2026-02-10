@echo off
REM Multi-Repository Quick Commands
REM Usage: repo [status|pull|push|sync] [all|main|nlm]

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\multi-repo.ps1" %*
