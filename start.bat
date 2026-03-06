@echo off
title 50-ci Zona Restaurant Sistemi
cd /d "%~dp0backend"

:: Avtomatik olaraq brauzeri açmaq üçün
start http://localhost:3000

:: Node.js serverini işə salmaq
npm start
