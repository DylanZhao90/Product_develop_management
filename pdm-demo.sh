#!/bin/bash
# PDM Demo — 可靠持久化启动脚本（systemd 级守护）
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:$HOME/.npm-global/bin"
PROJECT_DIR="/run/media/dylan/软件/B_AI_CODE_PROJECTS/Product_develop_management"
HTTP_PORT=4173
PID_FILE="/tmp/pdm-demo.pid"
LOCK_FILE="/tmp/pdm-demo.lock"

# Prevent concurrent runs
exec 200>"$LOCK_FILE"
flock -n 200 || { echo "Already running"; exit 0; }

cleanup() {
  # Kill ALL existing processes on our ports
  lsof -ti tcp:$HTTP_PORT 2>/dev/null | xargs kill -9 2>/dev/null
  pkill -f "lt --port $HTTP_PORT" 2>/dev/null
  rm -f "$PID_FILE"
  sleep 2
}

start() {
  cleanup
  
  cd "$PROJECT_DIR/frontend" || exit 1
  
  # 1. Start Vite preview
  setsid npx vite preview --host 0.0.0.0 --port $HTTP_PORT \
    > /tmp/pdm-http.log 2>&1 &
  HTTP_PID=$!
  
  # 2. Copy SPA as dashboard-demo.html
  cp "$PROJECT_DIR/frontend/dist/index.html" \
     "$PROJECT_DIR/frontend/dist/dashboard-demo.html" 2>/dev/null
  
  sleep 3
  
  # 3. Start localtunnel with auto-restart loop
  setsid bash -c '
    while true; do
      env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY \
        lt --port '"$HTTP_PORT"' > /tmp/pdm-tunnel.log 2>&1
      echo "[$(date)] Tunnel died, restarting..." >> /tmp/pdm-tunnel-restarts.log
      sleep 3
    done
  ' > /tmp/pdm-tunnel-wrapper.log 2>&1 &
  TUNNEL_PID=$!
  
  echo "{\"http\":$HTTP_PID,\"tunnel\":$TUNNEL_PID}" > $PID_FILE
  
  sleep 8
  TUNNEL_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.loca\.lt' /tmp/pdm-tunnel.log 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    echo "✅ Public URL: $TUNNEL_URL/dashboard-demo.html"
    echo "$TUNNEL_URL/dashboard-demo.html" > /tmp/pdm-current-url.txt
  else
    echo "⚠️  Tunnel URL not ready yet, check: tail -f /tmp/pdm-tunnel.log"
  fi
  echo "✅ Local: http://localhost:$HTTP_PORT/dashboard-demo.html"
}

stop() {
  cleanup
  echo "Stopped"
}

status() {
  HTTP_RUN=$(lsof -ti tcp:$HTTP_PORT 2>/dev/null && echo "running" || echo "stopped")
  TUNNEL_RUN=$(pgrep -f "lt --port $HTTP_PORT" 2>/dev/null && echo "running" || echo "stopped")
  URL=$(cat /tmp/pdm-current-url.txt 2>/dev/null || echo "unknown")
  echo "HTTP: $HTTP_RUN"
  echo "Tunnel: $TUNNEL_RUN"
  echo "URL: $URL"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) stop; sleep 2; start ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}" ;;
esac
