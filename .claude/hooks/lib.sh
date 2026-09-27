#!/usr/bin/env bash
# Shared helpers for Claude Code hooks. Hooks read a JSON payload on stdin.
# Exit 0 = ok, exit 2 = feed stderr back to Claude (PostToolUse) / block (PreToolUse, Stop).

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$PROJECT_DIR" || exit 0

# Read a dotted field (e.g. tool_input.file_path) from the JSON payload in $PAYLOAD.
json_field() {
  node -e '
    let v = JSON.parse(process.argv[1] || "{}");
    for (const k of process.argv[2].split(".")) v = v?.[k];
    if (v !== undefined && v !== null) process.stdout.write(String(v));
  ' "$PAYLOAD" "$1" 2>/dev/null
}

# True once the app is scaffolded and dependencies are installed.
project_ready() {
  command -v node >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1 \
    && [ -f package.json ] && [ -d node_modules ]
}

has_script() {
  node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$1" 2>/dev/null
}

# Print the last lines of a command's output to stderr for Claude.
report() {
  echo "$1" >&2
  echo "$2" | tail -n "${3:-60}" >&2
}
