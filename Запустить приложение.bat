@echo off
setlocal
cd /d "%~dp0"
title FinLedger

where npm >nul 2>&1 || (
  echo.
  echo Node.js и npm не найдены. Установите Node.js и повторите запуск.
  pause
  exit /b 1
)

netstat -ano | findstr /r /c:":3000 .*LISTENING" >nul && (
  echo Приложение уже запущено: http://localhost:3000
  start "" http://localhost:3000
  exit /b 0
)

if not exist "node_modules" (
  echo Устанавливаю зависимости...
  call npm install || goto :error
)

echo Запускаю базу данных...
call npm run db:up || goto :error

echo Применяю обновления базы данных...
call npm run db:setup || goto :error

echo.
echo Приложение запущено: http://localhost:3000
echo Чтобы остановить сервер, нажмите Ctrl+C в этом окне.
call npm run dev -- --port 3000
exit /b %errorlevel%

:error
echo.
echo Не удалось запустить приложение.
pause
exit /b 1