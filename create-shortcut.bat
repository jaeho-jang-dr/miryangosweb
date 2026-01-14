@echo off
REM Create Desktop Shortcut for Claude CLI

set SCRIPT="%TEMP%\CreateShortcut.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Miryang Claude.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "D:\Entertainments\DevEnvironment\miryangosweb\start-claude.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "D:\Entertainments\DevEnvironment\miryangosweb" >> %SCRIPT%
echo oLink.Description = "Miryang Orthopedic - Claude CLI" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript //nologo %SCRIPT%
del %SCRIPT%

echo.
echo ========================================
echo Desktop shortcut created successfully!
echo ========================================
echo.
echo You can now start Claude by:
echo 1. Double-clicking "Miryang Claude" on your desktop
echo 2. Or running: start-claude.bat
echo.
pause
