@echo off
REM ===================================
REM Add Claude to Windows Startup (Optional)
REM ===================================

echo.
echo ========================================
echo  Windows Startup Configuration
echo ========================================
echo.
echo This will add Claude CLI to your Windows startup folder.
echo Claude will automatically start when you log in to Windows.
echo.
echo WARNING: This means Claude will start EVERY TIME you boot Windows.
echo.
choice /C YN /M "Do you want to add Claude to Windows startup"

if errorlevel 2 goto :cancel
if errorlevel 1 goto :addstartup

:addstartup
echo.
echo Creating startup shortcut...

set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

set SCRIPT="%TEMP%\CreateStartupShortcut.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "%STARTUP_FOLDER%\Miryang Claude.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "D:\Entertainments\DevEnvironment\miryangosweb\start-claude.bat" >> %SCRIPT%
echo oLink.WorkingDirectory = "D:\Entertainments\DevEnvironment\miryangosweb" >> %SCRIPT%
echo oLink.Description = "Miryang Orthopedic - Claude CLI Auto Start" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript //nologo %SCRIPT%
del %SCRIPT%

echo.
echo ========================================
echo Startup shortcut created successfully!
echo ========================================
echo.
echo Claude will now start automatically when Windows starts.
echo.
echo To remove: Delete the shortcut from:
echo %STARTUP_FOLDER%
echo.
goto :end

:cancel
echo.
echo Operation cancelled.
echo.

:end
pause
