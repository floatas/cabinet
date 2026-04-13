#!/bin/bash
# Cabinet Daemon — host-side manager for Synology NAS
# Extracts daemon files from the Docker image and runs natively on the host.
# This allows the daemon to spawn Claude Code CLI with full host access.
#
# Usage:
#   ./nas-daemon.sh update   — extract latest daemon from Docker image
#   ./nas-daemon.sh start    — start the daemon
#   ./nas-daemon.sh stop     — stop the daemon
#   ./nas-daemon.sh restart  — stop + start
#   ./nas-daemon.sh status   — check if daemon is running
#   ./nas-daemon.sh deploy   — full deploy: pull image, restart container, update + restart daemon
#   ./nas-daemon.sh logs     — tail daemon log

set -e

CABINET_DIR="/volume1/Konteineris/Docker/cabinet"
DAEMON_DIR="${CABINET_DIR}/daemon"
DATA_DIR="${CABINET_DIR}/data"
LOG_FILE="${CABINET_DIR}/daemon.log"
PID_FILE="${CABINET_DIR}/daemon.pid"
IMAGE="ghcr.io/floatas/cabinet:latest"
COMPOSE_FILE="${CABINET_DIR}/docker-compose.yml"
DAEMON_PORT=3005

export PATH="/usr/local/bin:/opt/bin:$PATH"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

cmd_update() {
  log "Extracting daemon files from Docker image..."

  # Create a temporary container (don't start it)
  local cid
  cid=$(sudo /usr/local/bin/docker create "$IMAGE" --name cabinet-extract 2>/dev/null) || {
    log "ERROR: Failed to create container from $IMAGE. Pull the image first."
    exit 1
  }

  # Extract daemon files
  rm -rf "${DAEMON_DIR}.new"
  mkdir -p "${DAEMON_DIR}.new"

  sudo /usr/local/bin/docker cp "$cid:/app/server" "${DAEMON_DIR}.new/server"
  sudo /usr/local/bin/docker cp "$cid:/app/src" "${DAEMON_DIR}.new/src"
  sudo /usr/local/bin/docker cp "$cid:/app/node_modules" "${DAEMON_DIR}.new/node_modules"
  sudo /usr/local/bin/docker cp "$cid:/app/package.json" "${DAEMON_DIR}.new/package.json"
  sudo /usr/local/bin/docker cp "$cid:/app/tsconfig.json" "${DAEMON_DIR}.new/tsconfig.json"

  # Remove temp container
  sudo /usr/local/bin/docker rm "$cid" >/dev/null 2>&1

  # Atomic swap
  if [ -d "$DAEMON_DIR" ]; then
    rm -rf "${DAEMON_DIR}.old"
    mv "$DAEMON_DIR" "${DAEMON_DIR}.old"
  fi
  mv "${DAEMON_DIR}.new" "$DAEMON_DIR"
  rm -rf "${DAEMON_DIR}.old"

  # Fix ownership so current user can run it
  sudo chown -R "$(id -u):$(id -g)" "$DAEMON_DIR"

  log "Daemon files updated at ${DAEMON_DIR}"
}

cmd_start() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    log "Daemon already running (PID $(cat "$PID_FILE"))"
    return 0
  fi

  if [ ! -d "$DAEMON_DIR/server" ]; then
    log "Daemon files not found. Run: $0 update"
    exit 1
  fi

  # Fix permissions on data files owned by Docker (root) so daemon can read them
  sudo find "${DATA_DIR}/.agents/.runtime" -type f -exec chmod a+r {} \; 2>/dev/null || true
  sudo find "${DATA_DIR}/.agents" -maxdepth 1 -type d -exec chmod a+rx {} \; 2>/dev/null || true

  log "Starting Cabinet daemon..."

  cd "$DAEMON_DIR"

  NAS_IP=$(ip addr show eth0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
  NAS_IP=${NAS_IP:-192.168.0.162}

  CABINET_DATA_DIR="$DATA_DIR" \
  CABINET_DAEMON_PORT="${DAEMON_PORT}" \
  CABINET_APP_ORIGIN="http://127.0.0.1:3002,http://${NAS_IP}:3002" \
  CABINET_PUBLIC_DAEMON_ORIGIN="ws://${NAS_IP}:${DAEMON_PORT}" \
  PATH="/usr/local/bin:/opt/bin:$HOME/.local/bin:$PATH" \
  NODE_ENV=production \
    nohup /usr/local/bin/node "${DAEMON_DIR}/node_modules/tsx/dist/cli.mjs" server/cabinet-daemon.ts \
    >> "$LOG_FILE" 2>&1 &

  echo $! > "$PID_FILE"
  log "Daemon started (PID $!), logging to $LOG_FILE"
}

cmd_stop() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      log "Stopping daemon (PID $pid)..."
      kill "$pid"
      # Wait up to 5s for graceful shutdown
      for i in $(seq 1 10); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
      done
      # Force kill if still running
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
      log "Daemon stopped."
    else
      log "Daemon not running (stale PID file)."
    fi
    rm -f "$PID_FILE"
  else
    log "No PID file found."
  fi
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Daemon is running (PID $(cat "$PID_FILE"))"
    curl -s "http://127.0.0.1:${DAEMON_PORT}/health" 2>/dev/null && echo "" || echo "Health check failed"
  else
    echo "Daemon is not running"
  fi
}

cmd_deploy() {
  log "=== Full deploy ==="

  log "Pulling latest image..."
  sudo /usr/local/bin/docker pull "$IMAGE"

  log "Restarting web container..."
  cd "$CABINET_DIR"
  sudo /usr/local/bin/docker compose -f "$COMPOSE_FILE" up -d

  log "Updating daemon files..."
  cmd_stop
  cmd_update
  cmd_start

  log "=== Deploy complete ==="
  cmd_status
}

cmd_logs() {
  tail -f "$LOG_FILE"
}

case "${1:-}" in
  update)  cmd_update ;;
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_restart ;;
  status)  cmd_status ;;
  deploy)  cmd_deploy ;;
  logs)    cmd_logs ;;
  *)
    echo "Usage: $0 {update|start|stop|restart|status|deploy|logs}"
    exit 1
    ;;
esac
