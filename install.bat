@echo off
title Ilkin Quraşdırma (Install)
echo Zehmet olmasa gozleyin, sistem fayllari yuklenir...
cd /d "%~dp0backend"
npm install
echo.
echo Qurasdirma tamamlandi! Indi "start.bat" faylini ishe sala bilersiniz.
pause
