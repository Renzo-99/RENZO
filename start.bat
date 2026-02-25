@echo off
REM 목공실 관리 시스템 실행 스크립트 (Windows)
REM 사전 조건: Node.js 18+ 설치 필요

cd /d "%~dp0.next\standalone"

REM .env.local 환경변수 로드
if exist "..\..\\.env.local" (
  for /f "tokens=*" %%a in ('type "..\..\\.env.local" ^| findstr /v "^#"') do set %%a
)

echo 목공실 관리 시스템을 시작합니다...
echo 브라우저에서 http://localhost:3000 접속하세요
node server.js
pause
