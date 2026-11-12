#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js 20+ is required. Install it from https://nodejs.org, then run this script again."
  exit 1
fi
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' || { echo "Node.js 20 or newer is required."; exit 1; }
if [ ! -d node_modules/electron ]; then
  echo "Installing the desktop app dependencies on this device…"
  npm install
fi
npm start
