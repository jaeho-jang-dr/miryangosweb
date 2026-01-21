Set WshShell = CreateObject("WScript.Shell")

' Get desktop path
strDesktop = WshShell.SpecialFolders("Desktop")

' Create shortcut
Set oShellLink = WshShell.CreateShortcut(strDesktop & "\밀양 정형외과 Claude.lnk")

' Set working directory
oShellLink.TargetPath = "D:\Entertainments\DevEnvironment\miryangosweb\start-claude.bat"
oShellLink.WorkingDirectory = "D:\Entertainments\DevEnvironment\miryangosweb"
oShellLink.Description = "밀양 정형외과 웹사이트 - Claude CLI"
oShellLink.IconLocation = "C:\Windows\System32\SHELL32.dll,165"

' Save shortcut
oShellLink.Save

WScript.Echo "바탕화면에 바로가기가 생성되었습니다!"
WScript.Echo "위치: " & strDesktop & "\밀양 정형외과 Claude.lnk"
