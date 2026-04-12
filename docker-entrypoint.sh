#!/bin/bash
set -e

# Mark /data as safe for git
git config --global --add safe.directory /data

# Copy default data if /data is empty (first run)
if [ ! -f /data/index.md ]; then
  echo "First run detected — copying default data..."
  cp -rn /app/data-defaults/* /data/ 2>/dev/null || true
  cp -rn /app/data-defaults/.agents /data/.agents 2>/dev/null || true
fi

# Initialize git repo in data dir if not already
if [ ! -d /data/.git ]; then
  cd /data && git init && git add -A && git commit -m "Initial Cabinet data" 2>/dev/null || true
  cd /app
fi

# Start both processes
echo "Starting Cabinet..."
node server.js &
NEXT_PID=$!
npx tsx server/cabinet-daemon.ts &
DAEMON_PID=$!

# Wait for either to exit
wait -n $NEXT_PID $DAEMON_PID 2>/dev/null || wait $NEXT_PID
