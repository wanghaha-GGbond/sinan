#!/bin/bash
# 司南 monorepo 开发预览 — Web 为主，iOS 为辅
# 用法:
#   ./dev.sh          默认启动 Web (Next.js)
#   ./dev.sh web      启动 Web
#   ./dev.sh ios      启动 iOS (Expo + 模拟器)
#   ./dev.sh check    全量 TypeScript 检查
set -e
cd "$(dirname "$0")"
MODE="${1:-web}"

if [ "$MODE" = "check" ]; then
  echo "🔍 Web TypeScript..."
  (cd apps/web && npx tsc --noEmit) && echo "   ✅ Web TS OK"
  echo ""
  echo "🔍 iOS TypeScript..."
  (cd apps/ios && npx tsc --noEmit) && echo "   ✅ iOS TS OK"
  echo ""
  echo "📦 iOS Metro 打包..."
  (cd apps/ios && npx expo export --platform ios 2>&1 | tail -3)
  rm -rf apps/ios/dist
  echo ""
  echo "✅ 全部通过"
  exit 0
fi

if [ "$MODE" = "web" ]; then
  echo "🌐 启动 Next.js Web 开发服务器..."
  echo "   → http://localhost:3000"
  echo ""
  cd apps/web && npx next dev
elif [ "$MODE" = "ios" ]; then
  echo "🔍 iOS TypeScript + Metro..."
  (cd apps/ios && npx tsc --noEmit && npx expo export --platform ios 2>&1 | tail -1)
  rm -rf apps/ios/dist
  echo ""
  echo "📱 启动 Expo iOS..."
  cd apps/ios && npx expo start --ios
else
  echo "❌ 未知: $MODE  (可用: web | ios | check)"
  exit 1
fi
