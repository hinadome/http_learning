#!/usr/bin/env bash
# Pre-deploy gate: install, typecheck, production build.
# Run before Vercel/Netlify push or self-hosted release.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> HTTP Learning Checker deploy check"
echo "    Node: $(node -v)"
echo "    Root: $ROOT"

if [[ -f package-lock.json ]]; then
  echo "==> npm ci"
  npm ci
else
  echo "==> npm install"
  npm install
fi

echo "==> TypeScript (tsc --noEmit)"
npx tsc --noEmit

echo "==> Production build (next build)"
npm run build

echo ""
echo "Deploy check passed."
echo "Next: push to Git (Vercel/Netlify CI) or run self-host steps in DEPLOYMENT.md"
