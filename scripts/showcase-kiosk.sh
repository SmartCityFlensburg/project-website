#!/usr/bin/env bash
# Runs the booth loop from a local build. No network is required once dist/
# has been copied onto the booth machine, provided the local `serve`
# devDependency (or an already-primed npx cache) is present — see
# docs/showcase-booth.md.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dist="$root/dist"
port="${SHOWCASE_PORT:-4330}"

if [[ ! -d "$dist" ]]; then
  echo "dist/ fehlt. Erst 'pnpm showcase:build' ausführen." >&2
  exit 1
fi

if ! command -v chromium >/dev/null 2>&1; then
  echo "chromium wurde nicht gefunden. Ohne Browser kann die Tafel nicht starten." >&2
  exit 1
fi

if ! command -v xset >/dev/null 2>&1; then
  echo "xset wurde nicht gefunden. Ohne X11-Tools kann der Bildschirmschoner nicht abgeschaltet werden." >&2
  exit 1
fi

# A blanked screen at a trade fair stand is a dead stand.
xset s off || true
xset -dpms || true
xset s noblank || true

npx --yes serve "$dist" --listen "$port" --no-clipboard &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT

sleep 2

while true; do
  chromium \
    --kiosk \
    --incognito \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --autoplay-policy=no-user-gesture-required \
    "http://localhost:$port/de/showcase" || true
  echo "Browser beendet, Neustart in 3 Sekunden" >&2
  sleep 3
done
