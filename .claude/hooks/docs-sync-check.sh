#!/usr/bin/env bash
# Stop hook: if production code under src/ has uncommitted changes but no
# spec or doc file does, ask Claude (once) to check the CLAUDE.md rule
# "Keep specs and docs in sync" before finishing.
set -euo pipefail

input="$(cat)"
# Already reminded in this stop cycle: let Claude stop (prevents loops).
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
	exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Uncommitted paths (staged, unstaged, untracked); renames report the new path.
changed="$(git status --porcelain --untracked-files=all | sed -E 's/^.{3}//; s/.* -> //')"

code="$(printf '%s\n' "$changed" | grep -E '^src/' | grep -vE '\.test\.(ts|tsx)$' || true)"
docs="$(printf '%s\n' "$changed" | grep -E '^(openspec/specs/|openspec/changes/|docs/|CLAUDE\.md$)' || true)"

if [ -n "$code" ] && [ -z "$docs" ]; then
	files="$(printf '%s\n' "$code" | head -10 | sed 's/^/  - /')"
	jq -n --arg files "$files" '{
		decision: "block",
		reason: ("Production code changed without any spec or doc change:\n" + $files + "\n\nPer CLAUDE.md \"Keep specs and docs in sync\": if behavior changed, update the affected openspec/specs/<capability>/spec.md (or the open change) and docs/*.md now. If no update is needed (pure refactor, restored spec behavior), say so in one line and finish.")
	}'
fi
exit 0
