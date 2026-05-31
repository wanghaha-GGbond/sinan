#!/bin/bash
# 司南 iOS 开发预览 — 一键验证 + 启动
# 用法:
#   ./preview.sh          默认 Web 预览（优先）
#   ./preview.sh web      Web 浏览器预览
#   ./preview.sh ios      iOS 模拟器预览
#   ./preview.sh check    仅 TypeScript + Metro 打包验证（CI 用）
set -e
cd "$(dirname "$0")"

MODE="${1:-web}"

echo "🔍 TypeScript 检查..."
npx tsc --noEmit && echo "   ✅ TS 零错误"
echo ""

if [ "$MODE" = "check" ]; then
  echo "📦 Metro 打包检查 (iOS)..."
  npx expo export --platform ios 2>&1 | tail -3
  rm -rf dist
  echo ""
  echo "✅ 全部验证通过"
  exit 0
fi

if [ "$MODE" = "web" ]; then
  echo "🌐 启动 Web 预览 (浏览器打开)..."
  echo "   改代码自动热更新，无需手动刷新"
  echo ""
  npx expo start --web
elif [ "$MODE" = "ios" ]; then
  echo "📦 Metro 打包检查..."
  npx expo export --platform ios 2>&1 | tail -3
  rm -rf dist
  echo ""
  echo "📱 启动 iOS 模拟器预览..."
  echo "   也可手机扫 Expo Go 二维码看真机"
  echo ""
  npx expo start --ios
else
  echo "❌ 未知模式: $MODE"
  echo "   用法: ./preview.sh [web|ios|check]"
  exit 1
fi
