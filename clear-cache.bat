@echo off
echo Clearing Metro cache...
cd /d "%~dp0"
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q .expo 2>nul
del /f /q .expo-shared\* 2>nul
echo Cache cleared!
echo.
echo Now run: npm start -- --clear
pause
