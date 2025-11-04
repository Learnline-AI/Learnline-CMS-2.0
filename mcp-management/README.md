# MCP Server for LearnLine Educational CMS

Model Context Protocol (MCP) server that enables LLM-powered interactions with the LearnLine CMS.

## Features

- **3 Resources** (read-only data exposure):
  - Session nodes list
  - Node component sequences
  - Knowledge graph relationships

- **4 Tools** (write operations):
  - Add educational components
  - Edit component parameters
  - Delete components with confirmation
  - Create curriculum relationships

- **Dual LLM Support**:
  - **Gemini 2.5 Flash-Lite** (Free tier: 1,000 requests/day)
  - **Claude Sonnet 4** (Best reasoning, uses existing API key)

- **Live Sync**: WebSocket bridge updates frontend when MCP makes changes

## Installation

### 1. Install Dependencies

```bash
cd mcp-management
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create `.env` file:

```bash
# LLM API Keys
GEMINI_API_KEY=AIza...                    # Get from https://aistudio.google.com/apikey
ANTHROPIC_API_KEY=sk-ant-...              # Already exists in parent project

# Backend Configuration
FASTAPI_BASE_URL=http://localhost:8000    # Your existing FastAPI server
MCP_PORT=8001                             # MCP server port (separate from FastAPI)

# Default LLM Backend
DEFAULT_LLM_PROVIDER=gemini               # or 'claude'
```

### 3. Start the MCP Server

```bash
# Development mode with MCP Inspector
mcp dev mcp_server.py

# Production mode
mcp run mcp_server.py
```

## Usage

### Testing with MCP Inspector

The MCP Inspector provides a UI for testing resources and tools:

```bash
mcp dev mcp_server.py
# Opens browser with Inspector UI
```

### Example Interactions

**List nodes in session:**
```python
# Read resource
read_resource("session://abc123/nodes")
# Returns: "Session has 5 nodes: N001 (Intro to Fractions), N002 (Adding Fractions)..."
```

**Add component via tool:**
```python
# Call tool
call_tool("add_component", {
    "node_id": "N002",
    "component_type": "heading",
    "parameters": {"text": "Adding Fractions with Like Denominators"}
})
# Returns: "Component added successfully at position 1"
```

**Create prerequisite relationship:**
```python
call_tool("create_relationship", {
    "session_id": "abc123",
    "from_node_id": "N001",
    "to_node_id": "N002",
    "relationship_type": "PREREQUISITE_FOR",
    "explanation": "Students must understand fractions before adding them"
})
```

### Using with LLM Chat

The LLM backend (`llm_backend.py`) handles conversational interactions:

```python
from llm_backend import LLMBackend

backend = LLMBackend(provider="gemini")  # or "claude"
response = await backend.chat(
    "Add a definition component for 'numerator' to node N002",
    session_id="abc123"
)
```

## Architecture

```
Frontend Chat UI
    ↓
LLM Backend (Gemini or Claude)
    ↓
MCP Server (this folder)
    ↓ HTTP calls
FastAPI Backend (localhost:8000)
    ↓
SQLite Database
```

## Component Types

Valid educational component types:
- `heading` - Section headings
- `paragraph` - Text content
- `definition` - Term + definition pairs
- `memory-trick` - Mnemonic aids
- `worked-example` - Problem + solution + answer
- `step-sequence` - Ordered steps
- `callout-box` - Highlighted boxes
- `two-pictures`, `three-pictures`, `four-pictures` - Visual grids
- `three-svgs` - SVG illustrations
- `hero-number` - Statistical displays

## Relationship Types

Valid knowledge graph relationships:
- `LEADS_TO` - Sequential progression
- `PREREQUISITE_FOR` - Required prior knowledge
- `PREREQUISITE` - Reverse prerequisite
- `ENRICHMENT` - Optional advanced content

## File Structure

```
mcp-management/
├── mcp_server.py          # Main MCP protocol handler (140 lines)
├── mcp_context.py         # Session/node context tracking (70 lines)
├── mcp_resources.py       # Read-only data exposure (170 lines)
├── mcp_tools.py           # Write operations (260 lines)
├── llm_backend.py         # Dual LLM support (80 lines)
├── requirements.txt       # Dependencies
└── README.md              # This file
```

## Development

### Running Tests

```bash
# Test MCP connection
mcp dev mcp_server.py

# Test with Gemini
export DEFAULT_LLM_PROVIDER=gemini
python llm_backend.py

# Test with Claude
export DEFAULT_LLM_PROVIDER=claude
python llm_backend.py
```

### WebSocket Sync

Frontend can listen for MCP changes:

```javascript
const ws = new WebSocket('ws://localhost:8001/mcp-sync');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'component_added') {
        // Refresh component list
        loadNodeComponents(data.node_id);
    }
};
```

## Troubleshooting

**"Connection refused on port 8000"**
- Ensure FastAPI server is running: `cd ../python-services && uvicorn main:app --reload`

**"Invalid API key"**
- Check `.env` file has correct `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`

**"Rate limit exceeded"**
- Gemini free tier: 1,000 requests/day
- Switch to Claude or wait for quota reset (midnight PT)

**"Component type not recognized"**
- Validate against component types list above
- Check `component_schemas.py` in main project

## License

Part of the LearnLine AI Educational CMS project.
