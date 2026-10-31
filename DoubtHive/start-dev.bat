@echo off
REM DoubtHive single-command launcher (Windows).
title DoubtHive App
cd /d "%~dp0"

echo [1/3] Checking dependencies...
if not exist node_modules ( call npm install )
if not exist server\node_modules ( pushd server & call npm install & popd )
if not exist client\node_modules ( pushd client & call npm install & popd )

echo [2/3] Verifying database and demo accounts...
pushd server & node seed.js & popd

echo [3/3] Starting DoubtHive full-stack app in a single process...
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000/api
echo   Health:   http://localhost:5000/health
echo   Demo Logins: student@demo.com / faculty@demo.com / admin@demo.com (demo1234)
echo.

call npm run dev
