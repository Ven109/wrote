#!/usr/bin/env bash
# PreToolUse (Bash): block `git commit` unless lint, typecheck and tests pass.
source "$(dirname "$0")/lib.sh"
PAYLOAD="$(cat)"

CMD="$(json_field tool_input.command)"
echo "$CMD" | grep -Eq '(^|[;&|(][[:space:]]*)git[[:space:]][^;&|]*commit([[:space:]]|$)' || exit 0
project_ready || exit 0

# Unit + component tests locally (fast); API and e2e tests run in CI on every push.
for script in lint typecheck test:unit; do
  has_script "$script" || continue
  if ! OUT="$(pnpm run -s "$script" 2>&1)"; then
    report "Commit blocked: \`pnpm $script\` failed. Fix it, then commit again." "$OUT" 80
    exit 2
  fi
done
exit 0
