# MCP Server Quickstart Guide

## Setup (5 minutes)

### 1. Install Dependencies

```bash
cd mcp-management

# Activate the existing venv from python-services
source ../python-services/venv/bin/activate

# Install MCP dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create `.env` file:

```bash
cp .env.template .env
```

Edit `.env` and add your API keys:

```bash
# Required for LLM features
GEMINI_API_KEY=your_gemini_api_key        # Get from https://aistudio.google.com/apikey
ANTHROPIC_API_KEY=your_claude_api_key     # Get from https://console.anthropic.com/

# Backend configuration (defaults are fine)
FASTAPI_BASE_URL=http://localhost:8000
MCP_PORT=8001
DEFAULT_LLM_PROVIDER=gemini
```

### 3. Start the Servers

**Terminal 1 - FastAPI Backend (if not already running):**
```bash
cd python-services
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - MCP Server:**
```bash
cd mcp-management
source ../python-services/venv/bin/activate
python mcp_server.py
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

## Testing (2 minutes)

### Test 1: Health Check

```bash
curl http://localhost:8001/health
```

Expected output:
```json
{
  "status": "healthy",
  "service": "mcp-server",
  "version": "1.0.0",
  "context": {
    "session_id": null,
    "current_node_id": null,
    "current_screen": "content",
    ...
  }
}
```

### Test 2: List MCP Resources

```bash
curl -X POST http://localhost:8001/mcp/resources/list
```

Expected output:
```json
{
  "resources": [
    {
      "uri": "context://current",
      "name": "Current Context",
      "description": "Current session, node, and screen state",
      "mimeType": "text/plain"
    }
  ]
}
```

### Test 3: List MCP Tools

```bash
curl -X POST http://localhost:8001/mcp/tools/list
```

Expected output:
```json
{
  "tools": [
    {
      "name": "add_component",
      "description": "Add a new educational component to a node",
      ...
    },
    {
      "name": "edit_component",
      ...
    },
    {
      "name": "delete_component",
      ...
    },
    {
      "name": "create_relationship",
      ...
    }
  ]
}
```

### Test 4: Run Full Test Suite

```bash
python test_mcp.py
```

## Using with LLM (5 minutes)

### Option 1: Test with Gemini (Free)

```bash
# Make sure GEMINI_API_KEY is set in .env
export DEFAULT_LLM_PROVIDER=gemini

# Start interactive chat
python llm_backend.py
```

Try these commands:
- "What nodes are in the current session?"
- "Add a heading component that says 'Adding Fractions' to node N002"
- "Create a prerequisite relationship from N001 to N002"

### Option 2: Test with Claude

```bash
# Make sure ANTHROPIC_API_KEY is set in .env
export DEFAULT_LLM_PROVIDER=claude

# Start interactive chat
python llm_backend.py
```

## Frontend Integration (Optional)

Add WebSocket listener to your frontend (`frontend/public/app.js`):

```javascript
// Connect to MCP sync WebSocket
const mcpWs = new WebSocket('ws://localhost:8001/mcp-sync');

mcpWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('MCP event:', data);

    if (data.type === 'tool_executed') {
        // Refresh components or visual network based on tool
        if (data.tool === 'add_component' || data.tool === 'edit_component') {
            // Reload current node components
            loadNodeComponents(currentNodeId);
        }
        else if (data.tool === 'create_relationship') {
            // Refresh knowledge graph
            loadRelationships();
        }
    }
};

mcpWs.onerror = (error) => {
    console.log('MCP WebSocket error (non-critical):', error);
};
```

## Common Issues

### "Connection refused on port 8001"

Make sure MCP server is running:
```bash
cd mcp-management
python mcp_server.py
```

### "Connection refused on port 8000"

Make sure FastAPI backend is running:
```bash
cd python-services
uvicorn main:app --reload
```

### "Module not found: httpx"

Install dependencies:
```bash
pip install -r requirements.txt
```

### "Invalid API key"

Check your `.env` file has correct API keys:
```bash
cat .env  # Should show GEMINI_API_KEY or ANTHROPIC_API_KEY
```

### "Rate limit exceeded" (Gemini)

Free tier limits:
- 1,000 requests/day
- 15 requests/minute

Wait for quota reset (midnight Pacific Time) or switch to Claude.

## What's Next?

1. **Create a session** in the CMS frontend
2. **Copy the session_id** from the browser console
3. **Set context** in MCP:
   ```python
   # In Python
   from mcp_context import MCPContext
   context = MCPContext()
   context.set_session("your-session-id-here")
   context.set_node("N002")
   ```

4. **Use LLM to modify content:**
   ```bash
   python llm_backend.py
   >>> Add a definition component for 'numerator' to the current node
   ```

5. **See changes in frontend** - they'll appear immediately via WebSocket sync!

## Architecture Reminder

```
┌─────────────────┐
│  Frontend UI    │
│  (localhost/)   │
└────────┬────────┘
         │
         ├─→ FastAPI Backend (port 8000)
         │   └─→ SQLite Database
         │
         └─→ MCP Server (port 8001)
             └─→ LLM (Gemini/Claude)
                 └─→ Calls FastAPI via HTTP
```

## Files Overview

- `mcp_server.py` - Main server with FastAPI routes
- `mcp_context.py` - Session/node state tracking
- `mcp_resources.py` - Read-only data exposure (3 resources)
- `mcp_tools.py` - Write operations (4 tools)
- `llm_backend.py` - Dual LLM support (Gemini + Claude)
- `test_mcp.py` - Manual testing script
- `requirements.txt` - Python dependencies
- `.env` - API keys and configuration

**Total:** 780 lines of new code, zero changes to existing CMS!