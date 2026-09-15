#!/usr/bin/env bash
# Runs the booth loop from a local build. No network is required once dist/
# has been copied onto the booth machine: the server is our own
# scripts/showcase-server.mjs, which needs only Node, no node_modules.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dist="$root/dist"
port="${SHOWCASE_PORT:-4330}"
url="http://localhost:$port/de/showcase"

if [[ ! -d "$dist" ]]; then
  echo "dist/ fehlt. Erst 'pnpm showcase:build' ausführen." >&2
  exit 1
fi

for tool in chromium xset node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "$tool wurde nicht gefunden. Ohne $tool kann die Tafel nicht starten." >&2
    exit 1
  fi
done

# A blanked screen at a trade fair stand is a dead stand.
xset s off || true
xset -dpms || true
xset s noblank || true

# The server's pid lives in a file, not a shell variable, because the
# watchdog below runs in its own subshell and restarts it independently of
# this process.
pid_file="$(mktemp -t showcase-server-pid.XXXXXX)"
watchdog_pid=""

start_server() {
  SHOWCASE_PORT="$port" node "$root/scripts/showcase-server.mjs" "$dist" &
  echo "$!" >"$pid_file"
}

server_alive() {
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

wait_for_server() {
  for _ in {1..20}; do
    if node -e "fetch(process.argv[1]).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" "$url" 2>/dev/null; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

cleanup() {
  [[ -n "$watchdog_pid" ]] && kill "$watchdog_pid" 2>/dev/null || true
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  rm -f "$pid_file"
}
trap cleanup EXIT

# Backgrounding chromium below (instead of running it as bash's foreground
# command) takes it out of `|| true`'s reach: that idiom does not just ignore
# a nonzero exit code, it also swallows the "killed by SIGINT" status that
# would otherwise make bash re-raise the signal against itself and exit. A
# trap is the only reliable way back to that behaviour.
stopping=0
chromium_pid=""

request_stop() {
  stopping=1
  [[ -n "$chromium_pid" ]] && kill "$chromium_pid" 2>/dev/null || true
}
trap request_stop INT TERM

start_server

if ! wait_for_server; then
  echo "Server antwortet nach dem Start nicht auf $url. Abbruch." >&2
  exit 1
fi

# Watches the server independently of the Chromium loop below: Chromium can
# run for hours between restarts, so a dead server would otherwise go
# unnoticed until someone is standing in front of the screen.
(
  while true; do
    sleep 5
    if ! server_alive; then
      echo "Server ist abgestürzt, Neustart" >&2
      start_server
      wait_for_server || echo "Server antwortet nach dem Neustart nicht auf $url." >&2
    fi
  done
) &
watchdog_pid=$!

while [[ "$stopping" -eq 0 ]]; do
  chromium \
    --kiosk \
    --incognito \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --autoplay-policy=no-user-gesture-required \
    "$url" &
  chromium_pid=$!
  wait "$chromium_pid" || true
  chromium_pid=""

  [[ "$stopping" -eq 1 ]] && break

  echo "Browser beendet, Neustart in 3 Sekunden" >&2
  sleep 3
done
