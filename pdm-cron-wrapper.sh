#!/bin/bash
# PDM Demo auto-start wrapper (crontab @reboot)
# Retries until mount is ready
SCRIPT="/run/media/dylan/软件/B_AI_CODE_PROJECTS/Product_develop_management/start-pdm-demo.sh"
MAX_RETRIES=30
for i in $(seq 1 $MAX_RETRIES); do
  if [ -f "$SCRIPT" ]; then
    echo "[$(date)] Script found at attempt $i — starting..." >> /tmp/pdm-crontab.log
    bash "$SCRIPT" start >> /tmp/pdm-crontab.log 2>&1
    exit $?
  fi
  echo "[$(date)] Attempt $i/$MAX_RETRIES — waiting for mount..." >> /tmp/pdm-crontab.log
  sleep 10
done
echo "[$(date)] FATAL: Mount never appeared" >> /tmp/pdm-crontab.log
exit 1
