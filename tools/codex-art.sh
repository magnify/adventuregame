#!/usr/bin/env bash
# Ask Codex for art, on Brian's ChatGPT subscription and never an API key.
# Usage: tools/codex-art.sh "<the brief>" [reference image ...]
# Refuses to run unless Codex is signed in with ChatGPT; API-key variables are stripped so they can't take over,
# and the login method is forced to ChatGPT for this run. Codex works in this repo; its images land in ~/.codex/generated_images.
set -euo pipefail
brief="${1:?usage: tools/codex-art.sh \"<brief>\" [reference image ...]}"; shift || true
status="$(env -u OPENAI_API_KEY -u CODEX_API_KEY codex login status 2>&1 || true)"
case "$status" in *"Logged in using ChatGPT"*) ;; *) echo "codex-art: not signed in with the ChatGPT subscription ($status); run 'codex login' and choose ChatGPT" >&2; exit 1;; esac
refs=(); for f in "$@"; do refs+=(-i "$f"); done
# the brief goes in on stdin: after -i, Codex would read it as one more image
printf '%s' "$brief" | env -u OPENAI_API_KEY -u CODEX_API_KEY codex exec -c forced_login_method='"chatgpt"' -C "$(cd "$(dirname "$0")/.." && pwd)" -s workspace-write ${refs[@]+"${refs[@]}"}
