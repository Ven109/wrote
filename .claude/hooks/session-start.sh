#!/usr/bin/env bash
# SessionStart: make sure dependencies are installed so hooks and tests can run.
source "$(dirname "$0")/lib.sh"
PAYLOAD="$(cat)"

[ -f package.json ] || { echo "Wrote: app not scaffolded yet (no package.json) – hooks are inactive."; exit 0; }
command -v pnpm >/dev/null 2>&1 || corepack enable >/dev/null 2>&1 || true
command -v pnpm >/dev/null 2>&1 || { echo "Wrote: pnpm not available – install it to enable hooks."; exit 0; }

if [ ! -d node_modules ] || [ pnpm-lock.yaml -nt node_modules/.modules.yaml ]; then
  if pnpm install --frozen-lockfile >/dev/null 2>&1 || pnpm install >/dev/null 2>&1; then
    echo "Wrote: dependencies installed."
  else
    echo "Wrote: pnpm install failed – run it manually."
  fi
fi
exit 0
