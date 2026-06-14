#!/bin/bash
# PDM 演示 - 持久化启动脚本
# 用法: bash start-pdm-demo.sh [start|stop|status]

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:$HOME/.npm-global/bin:$HOME/node_modules/.bin:$HOME/.nvm/versions/node/*/bin:$NVM_BIN"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 2>/dev/null || true

PROJECT_DIR="/run/media/dylan/软件/B_AI_CODE_PROJECTS/Product_develop_management"
HTTP_PORT=8080
TUNNEL_SUBDOMAIN="pdm-anari"
PID_FILE="/tmp/pdm-demo.pid"

start() {
  echo "🔄 启动 PDM 演示服务..."

  # 启动 HTTP 服务器
  cd "$PROJECT_DIR"
  nohup python3 -m http.server $HTTP_PORT --bind 0.0.0.0 > /tmp/pdm-http.log 2>&1 &
  HTTP_PID=$!
  echo "  ✅ HTTP 服务已启动 (PID: $HTTP_PID) - 端口 $HTTP_PORT"

  # 启动 localtunnel (等待 HTTP 就绪)
  sleep 2
  nohup npx localtunnel --port $HTTP_PORT --subdomain $TUNNEL_SUBDOMAIN > /tmp/pdm-tunnel.log 2>&1 &
  TUNNEL_PID=$!
  echo "  ✅ 隧道已启动 (PID: $TUNNEL_PID)"

  # 保存 PID
  echo "{\"http\":$HTTP_PID,\"tunnel\":$TUNNEL_PID}" > $PID_FILE

  # 等待隧道就绪并输出 URL
  sleep 5
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  公网地址: https://$TUNNEL_SUBDOMAIN.loca.lt"
  echo "  本地地址: http://localhost:$HTTP_PORT"
  echo "═══════════════════════════════════════════"
  echo ""
  echo "日志文件:"
  echo "  HTTP:   tail -f /tmp/pdm-http.log"
  echo "  隧道:   tail -f /tmp/pdm-tunnel.log"
}

stop() {
  echo "🛑 停止 PDM 演示服务..."
  if [ -f $PID_FILE ]; then
    HTTP_PID=$(python3 -c "import json; print(json.load(open('$PID_FILE'))['http'])")
    TUNNEL_PID=$(python3 -c "import json; print(json.load(open('$PID_FILE'))['tunnel'])")
    kill $HTTP_PID 2>/dev/null
    kill $TUNNEL_PID 2>/dev/null
    rm -f $PID_FILE
    echo "  ✅ 已停止"
  else
    pkill -f "python3 -m http.server $HTTP_PORT" 2>/dev/null
    pkill -f "localtunnel" 2>/dev/null
    echo "  ✅ 已清理所有相关进程"
  fi
}

status() {
  HTTP_RUNNING=$(pgrep -f "python3 -m http.server $HTTP_PORT" 2>/dev/null | wc -l)
  TUNNEL_RUNNING=$(pgrep -f "localtunnel" 2>/dev/null | wc -l)
  echo "📊 PDM 演示状态:"
  echo "  HTTP 服务: $([ $HTTP_RUNNING -gt 0 ] && echo '✅ 运行中' || echo '❌ 已停止')"
  echo "  局域网地址: http://$(hostname -I 2>/dev/null | awk '{print $1}'):$HTTP_PORT"
  echo "  隧道: $([ $TUNNEL_RUNNING -gt 0 ] && echo '✅ 运行中 -> https://'$TUNNEL_SUBDOMAIN'.loca.lt' || echo '❌ 已停止')"
}

case "${1:-start}" in
  start) start ;;
  stop)  stop ;;
  status) status ;;
  restart) stop; sleep 2; start ;;
  *) echo "用法: bash start-pdm-demo.sh [start|stop|status|restart]" ;;
esac
