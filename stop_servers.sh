#!/bin/bash
# LearnLine CMS - Stop All Servers

echo "🛑 Stopping LearnLine Educational CMS Servers..."
echo ""

# Change to project directory
cd "$(dirname "$0")"

# Check for saved PIDs
if [ -f ".server_pids" ]; then
    echo "Using saved PIDs..."
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            echo "   ✓ Stopped process $pid"
        fi
    done < .server_pids
    rm .server_pids
fi

# Fallback: kill by port
echo "Checking for servers on ports 8000 and 8001..."

FASTAPI_PID=$(lsof -ti:8000)
if [ ! -z "$FASTAPI_PID" ]; then
    kill $FASTAPI_PID
    echo "   ✓ Stopped FastAPI (port 8000)"
fi

MCP_PID=$(lsof -ti:8001)
if [ ! -z "$MCP_PID" ]; then
    kill $MCP_PID
    echo "   ✓ Stopped MCP Server (port 8001)"
fi

# Kill any remaining mcp_server.py processes
pkill -f "mcp_server.py" 2>/dev/null

echo ""
echo "✅ All servers stopped"
