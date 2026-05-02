@echo off
title CAD Flow - Logs do Servidor
powershell -Command "Get-Content '%~dp0backend\cad-server.log' -Wait -Tail 50"
