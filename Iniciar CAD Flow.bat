@echo off
title CAD Flow - Inicializando...

echo Iniciando CAD Flow...

start "CAD Flow - Backend" powershell -NoExit -Command "cd '%~dp0backend'; npm run dev"
timeout /t 3 /nobreak >nul
start "CAD Flow - Frontend" powershell -NoExit -Command "cd '%~dp0frontend'; npm run dev"

echo.
echo Servidores iniciados!
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5174
echo.
echo Aguarde alguns segundos e clique no icone CAD Flow da area de trabalho.
pause
