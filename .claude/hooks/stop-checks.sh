#!/usr/bin/env bash
# Stop: before Claude finishes, make sure the working tree passes all checks.
source "$(dirname "$0")/lib.sh"
PAYLOAD="$(cat)"

# Avoid loops: if we already blocked once and Claude is continuing, let it stop.
[ "$(json_field stop_hook_active)" = "true" ] && exit 0
project_ready || exit 0

# Only check when code changed (uncommitted or untracked).
git status --porcelain -- 'app' 'server' 'shared' 'desktop' 'test' '*.ts' '*.vue' 2>/dev/null | grep -q . || exit 0

for script in lint typecheck test; do
  has_script "$script" || continue
  if ! OUT="$(pnpm run -s "$script" 2>&1)"; then
    report "Not done yet: \`pnpm $script\` fails on the current changes. Fix it before finishing." "$OUT" 80
    exit 2
  fi
done
exit 0
