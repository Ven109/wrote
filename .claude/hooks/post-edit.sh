#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): lint the edited file and run its tests.
source "$(dirname "$0")/lib.sh"
PAYLOAD="$(cat)"
project_ready || exit 0

FILE="$(json_field tool_input.file_path)"
[ -n "$FILE" ] && [ -f "$FILE" ] || exit 0
REL="${FILE#"$PROJECT_DIR"/}"

# Ignore generated / vendored paths.
case "$REL" in
  node_modules/*|.nuxt/*|.output/*|.wrote/*|dist/*|coverage/*|*.lock|pnpm-lock.yaml) exit 0 ;;
esac

FAILED=0

# 1. Lint (auto-fix) JS/TS/Vue files.
case "$REL" in
  *.ts|*.mts|*.js|*.mjs|*.vue)
    if ! OUT="$(pnpm exec eslint --fix --cache --no-warn-ignored "$REL" 2>&1)"; then
      report "ESLint errors in $REL (auto-fix applied where possible):" "$OUT"
      FAILED=1
    fi
    ;;
esac

# 2. Tests: run the file itself if it is a test, otherwise tests related to it.
case "$REL" in
  *.spec.ts) ;; # Playwright e2e: too slow per edit, run via `pnpm test:e2e`
  *.test.ts)
    if ! OUT="$(pnpm exec vitest run "$REL" 2>&1)"; then
      report "Tests failed in $REL:" "$OUT"
      FAILED=1
    fi
    ;;
  *.ts|*.mts|*.vue)
    if ! OUT="$(pnpm exec vitest related "$REL" --run --passWithNoTests 2>&1)"; then
      report "Tests related to $REL failed:" "$OUT"
      FAILED=1
    fi
    ;;
esac

[ "$FAILED" -eq 0 ] || exit 2
exit 0
