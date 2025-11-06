#!/bin/bash
# LearnLine CMS - Start All Servers

echo "🚀 Starting LearnLine Educational CMS Servers..."
echo ""

# Change to project directory
cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f "mcp-management/.env" ]; then
    echo "⚠️  Warning: mcp-management/.env not found"
    echo "Please create .env file with ANTHROPIC_API_KEY"
    exit 1
fi

# Start FastAPI Backend
echo "▶️  Starting FastAPI Backend (port 8000)..."
cd python-services
source venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
FASTAPI_PID=$!
echo "   ✓ FastAPI started (PID: $FASTAPI_PID)"
cd ..

# Wait a moment
sleep 2

# Start MCP Server
echo "▶️  Starting MCP WebSocket Server (port 8001)..."
cd mcp-management
python3 mcp_server.py &
MCP_PID=$!
echo "   ✓ MCP Server started (PID: $MCP_PID)"
cd ..

echo ""
echo "✅ All servers started successfully!"
echo ""
echo "📍 Access the CMS at: http://localhost:8000"
echo "📍 MCP Server: http://localhost:8001"
echo ""
echo "To stop servers:"
echo "  kill $FASTAPI_PID $MCP_PID"
echo ""
echo "Or use: ./stop_servers.sh"
echo ""

# Save PIDs to file for stop script
echo "$FASTAPI_PID" > .server_pids
echo "$MCP_PID" >> .server_pids

# Keep script running to show logs
wait
