@echo off
echo Demarrage PocketBase (backend NOUT)...
cd /d "%~dp0backend"
pocketbase.exe serve --http="127.0.0.1:8090"
pause
