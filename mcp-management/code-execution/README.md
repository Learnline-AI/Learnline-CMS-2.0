# Code Execution Environment - Week 1

## Overview

This folder contains the Docker-based code execution environment for the CMS. It provides a sandboxed Python environment where Claude-generated code can safely run and query the CMS data via FastAPI endpoints.

**Status:** Week 1 Complete - Foundation Ready
**Next Steps:** Week 2 - Code Executor with Safety Validations

---

## What's Included

### Files Created (Week 1)

| File | Lines | Purpose |
|------|-------|---------|
| `Dockerfile` | 30 | Docker image configuration with Python 3.11 + libraries |
| `code_helpers.py` | 300+ | 4 helper functions for accessing CMS data |
| `requirements.txt` | 10 | Python dependencies (requests, pandas, numpy, networkx) |
| `test_helpers.py` | 150+ | Comprehensive test suite for validation |
| `README.md` | This file | Setup and usage documentation |

**Total New Code:** ~490 lines
**Changes to Existing Code:** 0 lines (100% additive)

---

## Prerequisites

### 1. Docker Installation (REQUIRED)

You must install Docker before proceeding. Choose one:

#### Option A: Docker Desktop (Recommended for Beginners)
```bash
# Download from: https://www.docker.com/products/docker-desktop/
# Install the .dmg file
# Start Docker Desktop app
# Verify installation:
docker --version
docker run hello-world
```

#### Option B: OrbStack (Lightweight Alternative for Mac)
```bash
# Download from: https://orbstack.dev/
# Install the .dmg file
# Verify installation:
docker --version
docker run hello-world
```

### 2. FastAPI Backend Running

Your CMS FastAPI backend must be running on port 8000:

```bash
cd /path/to/CMS_Project_2/python-services
source venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Valid Session ID

You need a valid session ID from your CMS to test with. Get one by:
1. Opening the CMS frontend (http://localhost:8000)
2. Creating or loading a session
3. Checking the browser console or network tab for session ID

---

## Setup Instructions

### Step 1: Navigate to Code Execution Folder

```bash
cd /path/to/CMS_Project_2/mcp-management/code-execution
```

### Step 2: Build Docker Image

```bash
docker build -t cms-code-executor .
```

**Expected Output:**
```
[+] Building 45.2s (10/10) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 543B
 => [internal] load .dockerignore
 => [1/5] FROM docker.io/library/python:3.11-slim
 => [2/5] WORKDIR /app
 => [3/5] COPY requirements.txt /app/requirements.txt
 => [4/5] RUN pip install --no-cache-dir -r requirements.txt
 => [5/5] COPY code_helpers.py /app/code_helpers.py
 => exporting to image
 => => naming to docker.io/library/cms-code-executor
```

### Step 3: Verify Image Built Successfully

```bash
docker images | grep cms-code-executor
```

**Expected Output:**
```
cms-code-executor    latest    abc123def456    2 minutes ago    150MB
```

### Step 4: Test Helper Functions Import

```bash
docker run --rm cms-code-executor python -c "from code_helpers import *; print('✅ Imports successful')"
```

**Expected Output:**
```
✅ Imports successful
```

---

## Testing

### Test 1: Network Connectivity (Critical)

Verify Docker can reach your Mac's FastAPI backend:

```bash
docker run --rm cms-code-executor python -c "
import requests
response = requests.get('http://host.docker.internal:8000/health', timeout=5)
print(f'✅ FastAPI reachable: {response.status_code}')
"
```

**Expected Output:**
```
✅ FastAPI reachable: 200
```

**If This Fails:**
- Check FastAPI is running: `curl http://localhost:8000/health`
- Check Docker Desktop settings: Enable "Use host networking"
- Try alternative URL: `http://docker.for.mac.localhost:8000`

---

### Test 2: Helper Functions from Host Machine

First, test the helper functions directly from your Mac (outside Docker):

```bash
# Install dependencies on host machine
pip3 install requests pandas numpy networkx

# Run test script
python3 test_helpers.py <your-session-id>
```

**Example:**
```bash
python3 test_helpers.py abc123-456def-789ghi
```

**Expected Output:**
```
======================================================================
  STARTING CODE HELPER FUNCTION TESTS
======================================================================
ℹ️  FastAPI URL: http://host.docker.internal:8000
ℹ️  Session ID: abc123-456def-789ghi

======================================================================
  TEST 1: get_nodes()
======================================================================
Calling get_nodes('abc123-456def-789ghi')...
✅ Fetched 15 nodes
ℹ️  Sample node structure:
  - node_id: N001
  - title: Introduction to Fractions
  - content_category: Explanation
  - session_id: abc123-456def-789ghi

======================================================================
  TEST 2: get_relationships()
======================================================================
Calling get_relationships('abc123-456def-789ghi')...
✅ Fetched 8 relationships
ℹ️  Sample relationship structure:
  - from_node_id: N001
  - to_node_id: N002
  - relationship_type: LEADS_TO
  - explanation: Basic fractions lead to adding fractions

======================================================================
  TEST 3: get_node_content()
======================================================================
Calling get_node_content('N001')...
✅ Fetched node N001 with 5 components
ℹ️  Sample component structure:
  - component_type: heading
  - order_index: 1
  - confidence: 0.8

======================================================================
  TEST 4: analyze_graph()
======================================================================
Calling analyze_graph('abc123-456def-789ghi')...
✅ Built graph with 15 nodes and 8 edges
ℹ️  Graph properties:
  - Nodes: 15
  - Edges: 8
  - Directed: True
  - Sample node IDs: ['N001', 'N002', 'N003']

======================================================================
  TEST SUMMARY
======================================================================
test1_get_nodes: ✅ PASSED
test2_get_relationships: ✅ PASSED
test3_get_node_content: ✅ PASSED
test4_analyze_graph: ✅ PASSED

======================================================================
RESULTS: 4/4 tests passed
✅ ALL TESTS PASSED - Helper functions are working correctly!
ℹ️  You can proceed to Week 2: Code Executor
```

---

### Test 3: Helper Functions from Docker

If tests pass from host, now test from inside Docker:

```bash
docker run --rm \
  -e FASTAPI_URL=http://host.docker.internal:8000 \
  -v $(pwd):/app \
  cms-code-executor python test_helpers.py <your-session-id>
```

**Example:**
```bash
docker run --rm \
  -e FASTAPI_URL=http://host.docker.internal:8000 \
  -v $(pwd):/app \
  cms-code-executor python test_helpers.py abc123-456def-789ghi
```

**Expected Output:** Same as Test 2 (all 4 tests pass)

---

### Test 4: Individual Helper Functions

Test each helper function independently:

```bash
# Test get_nodes
docker run --rm \
  -e FASTAPI_URL=http://host.docker.internal:8000 \
  cms-code-executor python -c "
from code_helpers import get_nodes
nodes = get_nodes('your-session-id')
print(f'Found {len(nodes)} nodes')
"

# Test get_relationships
docker run --rm \
  -e FASTAPI_URL=http://host.docker.internal:8000 \
  cms-code-executor python -c "
from code_helpers import get_relationships
rels = get_relationships('your-session-id')
print(f'Found {len(rels)} relationships')
"

# Test get_node_content
docker run --rm \
  -e FASTAPI_URL=http://host.docker.internal:8000 \
  cms-code-executor python -c "
from code_helpers import get_node_content
content = get_node_content('N001')
print(f'Node has {len(content.get(\"components\", []))} components')
"

# Test analyze_graph
docker run --rm \
  -e FASTAPI_URL=http://host.docker.internal:8000 \
  cms-code-executor python -c "
from code_helpers import analyze_graph
G = analyze_graph('your-session-id')
print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')
"
```

---

## Helper Functions Reference

### 1. `get_nodes(session_id)`

**Purpose:** Fetch all nodes in a session

**Parameters:**
- `session_id` (str): Session ID

**Returns:** List of node dictionaries
```python
[
    {
        "node_id": "N001",
        "title": "Introduction to Fractions",
        "content_category": "Explanation",
        "session_id": "abc123",
        ...
    },
    ...
]
```

**Example Usage:**
```python
from code_helpers import get_nodes

nodes = get_nodes('abc123-456def')
print(f"Total nodes: {len(nodes)}")

# Find nodes about fractions
fraction_nodes = [n for n in nodes if 'fraction' in n['title'].lower()]
print(f"Fraction nodes: {len(fraction_nodes)}")
```

---

### 2. `get_relationships(session_id)`

**Purpose:** Fetch all relationships in a session

**Parameters:**
- `session_id` (str): Session ID

**Returns:** List of relationship dictionaries
```python
[
    {
        "from_node_id": "N001",
        "to_node_id": "N002",
        "relationship_type": "LEADS_TO",
        "explanation": "...",
        "session_id": "abc123",
        ...
    },
    ...
]
```

**Example Usage:**
```python
from code_helpers import get_relationships

rels = get_relationships('abc123-456def')

# Find prerequisite relationships
prerequisites = [r for r in rels if 'PREREQUISITE' in r['relationship_type']]
print(f"Prerequisites: {len(prerequisites)}")

# Find nodes with no prerequisites
all_nodes = get_nodes('abc123-456def')
nodes_with_prereqs = set(r['to_node_id'] for r in prerequisites)
orphans = [n for n in all_nodes if n['node_id'] not in nodes_with_prereqs]
print(f"Nodes without prerequisites: {[n['node_id'] for n in orphans]}")
```

---

### 3. `get_node_content(node_id)`

**Purpose:** Fetch full node content with all components

**Parameters:**
- `node_id` (str): Node ID (e.g., "N001")

**Returns:** Dictionary with node and components
```python
{
    "node_id": "N001",
    "components": [
        {
            "component_type": "heading",
            "parameters": {"text": "Introduction"},
            "order_index": 1,
            "confidence": 0.8
        },
        ...
    ]
}
```

**Example Usage:**
```python
from code_helpers import get_node_content

content = get_node_content('N001')
components = content.get('components', [])

# Count component types
from collections import Counter
types = Counter(c['component_type'] for c in components)
print(f"Component types: {dict(types)}")

# Find worked examples
worked_examples = [c for c in components if c['component_type'] == 'worked-example']
print(f"Worked examples: {len(worked_examples)}")
```

---

### 4. `analyze_graph(session_id)`

**Purpose:** Build NetworkX graph for analysis

**Parameters:**
- `session_id` (str): Session ID

**Returns:** `networkx.DiGraph` object

**Example Usage:**
```python
from code_helpers import analyze_graph
import networkx as nx

G = analyze_graph('abc123-456def')

# Graph statistics
print(f"Nodes: {G.number_of_nodes()}")
print(f"Edges: {G.number_of_edges()}")
print(f"Density: {nx.density(G):.3f}")

# Find shortest path
path = nx.shortest_path(G, 'N001', 'N010')
print(f"Shortest path from N001 to N010: {path}")

# Find cycles
cycles = list(nx.simple_cycles(G))
print(f"Cycles detected: {len(cycles)}")

# Find isolated nodes
isolated = list(nx.isolates(G))
print(f"Isolated nodes: {isolated}")

# Page rank (importance)
ranks = nx.pagerank(G)
top_nodes = sorted(ranks.items(), key=lambda x: x[1], reverse=True)[:5]
print(f"Most important nodes: {[node_id for node_id, rank in top_nodes]}")
```

---

## Troubleshooting

### Error: `docker: command not found`

**Problem:** Docker not installed

**Solution:**
1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Or install OrbStack: https://orbstack.dev/
3. Verify: `docker --version`

---

### Error: `requests.exceptions.ConnectionError`

**Problem:** Docker can't reach FastAPI backend

**Possible Causes & Solutions:**

1. **FastAPI not running:**
   ```bash
   # Check if running:
   curl http://localhost:8000/health

   # If not, start it:
   cd python-services
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Wrong URL in Docker:**
   - Mac/Windows: Use `http://host.docker.internal:8000`
   - Linux: Use `http://172.17.0.1:8000` (Docker bridge IP)

3. **Firewall blocking:**
   - Check macOS firewall settings
   - Allow Docker to access network

---

### Error: `Session not found` or `Node not found`

**Problem:** Invalid session ID or node ID

**Solution:**
1. Open CMS frontend: http://localhost:8000
2. Create or load a session
3. Copy the session ID from browser console or network tab
4. Use that session ID in tests

---

### Error: `ModuleNotFoundError: No module named 'code_helpers'`

**Problem:** Running from wrong directory or missing volume mount

**Solution:**
```bash
# Make sure you're in the code-execution folder:
cd /path/to/mcp-management/code-execution

# When running Docker, mount current directory:
docker run --rm -v $(pwd):/app cms-code-executor python test_helpers.py <session_id>
```

---

### Error: Docker build fails with network timeout

**Problem:** Docker can't download packages

**Solution:**
```bash
# Check internet connection
ping google.com

# Try building with longer timeout:
DOCKER_BUILDKIT=1 docker build --network host -t cms-code-executor .

# Or use a mirror (if in China/restrictive network):
# Edit Dockerfile, add before RUN pip install:
# RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

---

## Success Criteria

Before moving to Week 2, verify:

- [x] Docker installed and running (`docker --version` works)
- [x] Docker image builds successfully (`docker build -t cms-code-executor .`)
- [x] Helper functions import correctly (test with `docker run --rm cms-code-executor python -c "from code_helpers import *"`)
- [x] Network connectivity works (Docker can reach `http://host.docker.internal:8000/health`)
- [x] All 4 helper functions return data from host machine (`python3 test_helpers.py <session_id>`)
- [x] All 4 helper functions return data from Docker (`docker run ... test_helpers.py <session_id>`)
- [x] Data formats match expected structure (nodes are lists, graph is NetworkX object, etc.)

If all checked, you're ready for Week 2!

---

## What's Next: Week 2

Week 2 will add the code executor service (`code_executor.py`) with:

- **Timeout protection** (kill code after 5 seconds)
- **Safety validations** (block dangerous imports, builtins)
- **Error handling** (clear error messages for Claude)
- **Container management** (automatic cleanup)
- **AST parsing** (syntax validation before execution)

Week 2 files will be added to `mcp-management/` (parent folder), not this folder.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  WEEK 1: Code Execution Environment                         │
│  Location: mcp-management/code-execution/                   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
        ┌───────────────────────────────────────┐
        │   Docker Container                     │
        │   (cms-code-executor)                  │
        │                                        │
        │   ┌──────────────────────────┐        │
        │   │  code_helpers.py         │        │
        │   │                          │        │
        │   │  • get_nodes()          │─────┐  │
        │   │  • get_relationships()  │     │  │
        │   │  • get_node_content()   │     │  │
        │   │  • analyze_graph()      │     │  │
        │   └──────────────────────────┘     │  │
        │                                     │  │
        │   Python 3.11 + Libraries          │  │
        │   • requests                        │  │
        │   • pandas                          │  │
        │   • numpy                           │  │
        │   • networkx                        │  │
        └─────────────────────────────────────┼──┘
                                              │
                                              │ HTTP Requests
                                              ▼
                              ┌───────────────────────────────┐
                              │  Your Mac                     │
                              │  host.docker.internal:8000    │
                              │                               │
                              │  ┌─────────────────────────┐ │
                              │  │  FastAPI Backend        │ │
                              │  │  • GET /session/*/nodes │ │
                              │  │  • GET /nodes/*/content │ │
                              │  │  • GET /session/*/rels  │ │
                              │  └─────────────────────────┘ │
                              │                               │
                              │  ┌─────────────────────────┐ │
                              │  │  SQLite Database        │ │
                              │  │  • sessions             │ │
                              │  │  • nodes                │ │
                              │  │  • node_components      │ │
                              │  │  • relationships        │ │
                              │  └─────────────────────────┘ │
                              └───────────────────────────────┘

Week 2 will add:
┌─────────────────────────────────────┐
│  code_executor.py                   │
│  • Spins up Docker                  │
│  • Validates code safety            │
│  • Executes with timeout            │
│  • Returns results                  │
└─────────────────────────────────────┘
```

---

## Questions?

If you encounter issues not covered in this README:

1. Check FastAPI is running and accessible
2. Check Docker is running (`docker ps` should work)
3. Check session ID is valid (test in CMS frontend)
4. Check network connectivity (can Docker reach host?)
5. Review error messages carefully (they're designed to be helpful)

Ready to proceed to Week 2? Make sure all success criteria are checked!
