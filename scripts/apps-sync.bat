@echo off
:: apps-sync.bat - smart-sync.ps1 래퍼
:: 사용법: apps-sync [command] [options]
::
:: 스마트 동기화 (PowerShell):
::   apps-sync status              변경 현황 대시보드
::   apps-sync push                변경된 것만 push
::   apps-sync push -All           전부 push
::   apps-sync push -App noterang  특정 앱만 push
::   apps-sync pull                전체 pull
::   apps-sync pull -App jpdf      특정 앱만 pull
::   apps-sync sync                pull 후 push
::   apps-sync setup               remote 설정

set "SCRIPT_DIR=%~dp0"
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%smart-sync.ps1" %*
