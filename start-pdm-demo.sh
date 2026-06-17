#!/bin/bash
# PDM Demo start script
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:$HOME/.npm-global/bin"
PROJECT_DIR="/run/media/dylan/软件/B_AI_CODE_PROJECTS/Product_develop_management"
HTTP_PORT=4173
PID_FILE="/tmp/pdm-demo.pid"

start() {
  echo "Starting PDM demo..."
  cd "$PROJECT_DIR/frontend" || exit 1
  
  # Start vite preview
  nohup npx vite preview --host 0.0.0.0 --port $HTTP_PORT > /tmp/pdm-http.log 2>&1 &
  HTTP_PID=$!
  echo "HTTP server PID: $HTTP_PID"
  
  # Copy SPA build as dashboard-demo.html (from Vite build output)
  cp "$PROJECT_DIR/frontend/dist/index.html" "$PROJECT_DIR/frontend/dist/dashboard-demo.html" 2>/dev/null
  
  # Wait for server
  sleep 3
  
  # Start localtunnel (clear proxy env)
  nohup env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY \
    npx localtunnel --port $HTTP_PORT \
    > /tmp/pdm-tunnel.log 2>&1 &
  TUNNEL_PID=$!
  echo "Tunnel PID: $TUNNEL_PID"
  
  echo "{\"http\":$HTTP_PID,\"tunnel\":$TUNNEL_PID}" > $PID_FILE
  
  # Wait and get URL
  sleep 8
  TUNNEL_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.loca\.lt' /tmp/pdm-tunnel.log 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    echo "Public URL: $TUNNEL_URL/dashboard-demo.html"
  else
    echo "Tunnel URL not yet ready..."
    echo "Check: tail -f /tmp/pdm-tunnel.log"
  fi
  echo "Local: http://localhost:$HTTP_PORT/dashboard-demo.html"
}

stop() {
  if [ -f "$PID_FILE" ]; then
    HTTP_PID=$(grep -oP '"http":\K[0-9]+' "$PID_FILE" 2>/dev/null)
    TUNNEL_PID=$(grep -oP '"tunnel":\K[0-9]+' "$PID_FILE" 2>/dev/null)
    [ -n "$HTTP_PID" ] && kill "$HTTP_PID" 2>/dev/null
    [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
    rm -f "$PID_FILE"
  fi
  pkill -f "lt --port $HTTP_PORT" 2>/dev/null
  pkill -f "vite preview.*$HTTP_PORT" 2>/dev/null
  echo "Stopped"
}

status() {
  HTTP_RUN=$(pgrep -f "vite preview.*4173" >/dev/null && echo "running" || echo "stopped")
  TUNNEL_RUN=$(pgrep -f "lt --port 4173" >/dev/null && echo "running" || echo "stopped")
  TUNNEL_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.loca\.lt' /tmp/pdm-tunnel.log 2>/dev/null | head -1)
  echo "HTTP: $HTTP_RUN"
  echo "Tunnel: $TUNNEL_RUN"
  [ -n "$TUNNEL_URL" ] && echo "URL: $TUNNEL_URL/dashboard-demo.html"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) stop; sleep 2; start ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}" ;;
esac
