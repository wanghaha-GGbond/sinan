#!/bin/bash
# 司南 (Sinan) — Quick Launch Script
# Starts the Next.js dev server after loading nvm

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

cd /home/wanghaha/司南/apps/web
echo "🚀 Starting 司南 dev server..."
npm run dev
