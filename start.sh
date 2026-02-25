#!/bin/bash
# 목공실 관리 시스템 실행 스크립트
# 사전 조건: Node.js 18+ 설치 필요

cd "$(dirname "$0")/.next/standalone"

# .env.local이 있으면 환경변수 로드
if [ -f "../../.env.local" ]; then
  export $(grep -v '^#' ../../.env.local | xargs)
fi

echo "목공실 관리 시스템을 시작합니다..."
echo "브라우저에서 http://localhost:3000 접속하세요"
node server.js
