"""
Dual LLM Backend Support
Supports both Gemini (free tier) and Claude (best quality)
With multimodal support for PDFs and images
"""

import os
import sys
import logging
import base64
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
import httpx

# Add python-services to path for component schemas
sys.path.insert(0, str(Path(__file__).parent.parent / "python-services"))
from component_schemas import build_component_prompt_section

logger = logging.getLogger(__name__)

class LLMBackend:
    """Manages LLM interactions with MCP tools"""

    def __init__(self, provider: str = "gemini"):
        """
        Initialize LLM backend

        Args:
            provider: 'gemini' or 'claude'
        """
        self.provider = provider.lower()
        self.mcp_server_url = os.getenv("MCP_SERVER_URL", "http://localhost:8001")

        # Initialize clients
        self.gemini_client = None
        self.claude_client = None

        if self.provider == "gemini":
            self._init_gemini()
        elif self.provider == "claude":
            self._init_claude()
        else:
            raise ValueError(f"Invalid provider: {provider}. Must be 'gemini' or 'claude'")

    def _init_gemini(self):
        """Initialize Gemini client"""
        try:
            from google import genai
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not set")

            self.gemini_client = genai.Client(api_key=api_key)
            self.model = "gemini-2.5-flash-lite"  # Best free tier
            logger.info(f"Initialized Gemini client with model {self.model}")
        except ImportError:
            logger.error("google-genai package not installed. Run: pip install google-genai")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            raise

    def _init_claude(self):
        """Initialize Claude client"""
        try:
            from anthropic import Anthropic
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not set")

            self.claude_client = Anthropic(api_key=api_key)
            self.model = "claude-sonnet-4-5-20250929"
            logger.info(f"Initialized Claude client with model {self.model}")
        except ImportError:
            logger.error("anthropic package not installed. Run: pip install anthropic")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Claude: {e}")
            raise

    async def chat(self, user_message: str, session_id: Optional[str] = None) -> str:
        """
        Send a text-only chat message and handle tool calls

        Args:
            user_message: User's message
            session_id: Optional session ID for context

        Returns:
            LLM's final response
        """
        # Get MCP tools
        tools = await self._get_mcp_tools()

        # Get context
        context = await self._get_context()

        # Prepare messages
        system_message = self._build_system_message(context)

        if self.provider == "gemini":
            return await self._chat_gemini(user_message, tools, system_message)
        else:
            return await self._chat_claude(user_message, tools, system_message)

    async def chat_with_file(self, user_message: str, file_data: Union[bytes, str],
                            session_id: Optional[str] = None, file_type: str = "auto") -> str:
        """
        Send a chat message with attached file (PDF or image)

        Args:
            user_message: User's message
            file_data: File bytes or path string
            session_id: Optional session ID for context
            file_type: 'pdf', 'image', or 'auto' (auto-detect)

        Returns:
            LLM's final response describing the file and/or tool execution result
        """
        # Auto-detect file type if needed
        if file_type == "auto":
            file_type = self._detect_file_type(file_data)

        # Validate file type
        if file_type not in ["pdf", "image"]:
            return f"Unsupported file type: {file_type}. Supported types: pdf, image"

        # Get MCP tools
        tools = await self._get_mcp_tools()

        # Get context
        context = await self._get_context()

        # Prepare messages
        system_message = self._build_system_message(context)

        # Route to appropriate provider with file support
        try:
            if self.provider == "gemini":
                return await self._chat_gemini(user_message, tools, system_message, file_data, file_type)
            else:
                return await self._chat_claude(user_message, tools, system_message, file_data, file_type)
        except Exception as e:
            logger.error(f"Error in chat_with_file: {e}")
            return f"Error processing file: {str(e)}"

    def _detect_file_type(self, file_data: Union[bytes, str]) -> str:
        """Auto-detect file type from bytes or path"""
        if isinstance(file_data, str):
            # It's a file path - check extension
            if file_data.lower().endswith('.pdf'):
                return "pdf"
            elif file_data.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                return "image"
        elif isinstance(file_data, bytes):
            # Check file magic bytes
            if file_data[:4] == b'%PDF':
                return "pdf"
            elif file_data[:2] == b'\xff\xd8':  # JPEG
                return "image"
            elif file_data[:8] == b'\x89PNG\r\n\x1a\n':  # PNG
                return "image"

        return "unknown"

    async def _get_mcp_tools(self) -> List[Dict[str, Any]]:
        """Fetch MCP tools from server"""
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.mcp_server_url}/mcp/tools/list")
            data = response.json()
            return data.get("tools", [])

    async def _get_context(self) -> str:
        """Fetch current context from MCP server"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.mcp_server_url}/mcp/resources/read",
                json={"uri": "context://current"}
            )
            data = response.json()
            contents = data.get("contents", [])
            if contents:
                return contents[0].get("text", "")
            return "No context available"

    def _build_code_execution_guide(self) -> str:
        """Build comprehensive code execution documentation for system prompt"""
        return """

## Code Execution Tool

You have access to Python code execution for analyzing curriculum data at scale.
Use `execute_code` when you need to query, analyze, or find patterns across the curriculum.

### Available Helper Functions

1. **get_nodes(session_id)** → List[Dict]
   Returns all nodes in the session with properties: node_id, title, content_category, etc.

2. **get_relationships(session_id)** → List[Dict]
   Returns all relationships: from_node_id, to_node_id, relationship_type, explanation

3. **get_node_content(node_id)** → Dict
   Returns full node data including all educational components

4. **analyze_graph(session_id)** → networkx.DiGraph
   Returns NetworkX graph for path analysis, cycle detection, centrality calculations

### Allowed Imports
- **Data analysis**: pandas, numpy, networkx
- **Math**: math, statistics, decimal, fractions
- **Standard library**: collections, itertools, datetime, json, csv, re
- **Custom**: code_helpers (contains the helper functions)

### Working Examples

**Example 1: Count nodes in curriculum**
```python
from code_helpers import get_nodes
nodes = get_nodes(session_id)
print(f"Total nodes: {len(nodes)}")
result = len(nodes)
```

**Example 2: Find orphan nodes (no prerequisites)**
```python
from code_helpers import get_nodes, get_relationships
nodes = get_nodes(session_id)
rels = get_relationships(session_id)

# Find nodes that are targets of PREREQUISITE relationships
nodes_with_prereqs = set()
for rel in rels:
    if 'PREREQUISITE' in rel['relationship_type']:
        nodes_with_prereqs.add(rel['to_node_id'])

# Nodes not in that set are orphans
orphans = [n for n in nodes if n['node_id'] not in nodes_with_prereqs]
result = [n['node_id'] for n in orphans]
```

**Example 3: Find shortest path between nodes**
```python
from code_helpers import analyze_graph
import networkx as nx

G = analyze_graph(session_id)
try:
    path = nx.shortest_path(G, source='N001', target='N020')
    print(f"Shortest path: {' → '.join(path)}")
    result = path
except nx.NetworkXNoPath:
    result = "No path exists between these nodes"
```

**Example 4: Search for specific content**
```python
from code_helpers import get_nodes
nodes = get_nodes(session_id)

# Find nodes about fractions
fraction_nodes = [n for n in nodes
                 if 'fraction' in n.get('title', '').lower()]

print(f"Found {len(fraction_nodes)} nodes about fractions")
result = [{'id': n['node_id'], 'title': n['title']}
          for n in fraction_nodes]
```

**Example 5: Statistical analysis with pandas**
```python
from code_helpers import get_nodes
import pandas as pd

nodes = get_nodes(session_id)
df = pd.DataFrame(nodes)

# Analyze node structure
print(f"Total nodes: {len(df)}")
print(f"Columns: {list(df.columns)}")

# Example: Group by chapter if available
if 'chapter_id' in df.columns:
    chapter_counts = df.groupby('chapter_id').size().to_dict()
    result = chapter_counts
else:
    result = {"total_nodes": len(df), "columns": list(df.columns)}
```

### When to Use Code Execution

**USE execute_code for:**
- ✅ "How many nodes are in my curriculum?" (counting/statistics)
- ✅ "Which nodes have no prerequisites?" (pattern finding)
- ✅ "Find all nodes about fractions" (searching/filtering)
- ✅ "Shortest path from N001 to N020" (graph algorithms)
- ✅ "What's the most common component type?" (aggregation)
- ✅ "Show me the curriculum structure" (graph analysis)

**DO NOT use execute_code for:**
- ❌ "Add a heading to node N002" → Use **add_component**
- ❌ "Edit this definition text" → Use **edit_component**
- ❌ "Connect N001 to N002" → Use **create_relationship**
- ❌ "Delete this worked example" → Use **delete_component**
- ❌ Processing a PDF → Use **batch_add_components**

### Important Notes
- `session_id` is automatically available in your code (pre-injected)
- Code runs in sandboxed Docker container (5-second timeout)
- Execution is read-only (cannot modify database)
- Always import helper functions: `from code_helpers import get_nodes`
- Return final result with: `result = ...`
- Use `print()` for intermediate debugging output

### Defensive Coding Best Practices
**ALWAYS use defensive coding to handle missing/null data:**

```python
# ❌ BAD - will crash if component_type is None
comp_type = comp.get('component_type').upper()

# ✅ GOOD - safely handles None values
comp_type = comp.get('component_type')
if comp_type:
    comp_type = comp_type.upper()
else:
    comp_type = 'UNKNOWN'

# ✅ BETTER - one-liner with default
comp_type = (comp.get('component_type') or 'UNKNOWN').upper()
```

**Common fields that may be None:**
- `component_type` in components
- `title`, `content_category` in nodes
- `relationship_type`, `explanation` in relationships
- Any `parameters` dict values

**Always use `.get()` with defaults and check for None before calling methods like `.upper()`, `.lower()`, `.split()`, etc.**
"""

    def _build_system_message(self, context: str) -> str:
        """Build system message with context and component knowledge"""
        # Get component documentation from schemas
        component_guide = build_component_prompt_section()

        return f"""You are an AI assistant helping to manage an educational CMS for K-12 math lessons.

{context}

# PDF Processing Protocol (MANDATORY)

When you receive a PDF file attached to a message:
1. Analyze the PDF content carefully to identify educational components
2. Extract components from the content based on their structure and purpose
3. YOU MUST call the `batch_add_components` tool with:
   - node_id: Use the current node_id from the context above
   - components: Array of extracted components with proper types and parameters
4. DO NOT just describe what you see in the PDF - you MUST save it using the batch_add_components tool
5. After calling the tool, confirm the save with the component count and types

Component extraction guidelines for PDFs:
- Identify headings → use **heading** component
- Find explanatory text → use **paragraph** component
- Locate formal definitions → use **definition** component (term + definition)
- Spot visual content (diagrams, charts, fractions) → use **hero-number** component
- Extract step-by-step procedures → use **step-sequence** or **worked-example**
- Find memory tricks or tips → use **memory-trick** or **callout-box**
- Multiple images in a row → use **two-pictures**, **three-pictures**, or **four-pictures**

# Available Educational Components

{component_guide}

# Component Selection Guidelines

When analyzing educational content:
- Use **hero-number** for visual fraction representations, part-of-whole relationships
- Use **worked-example** for step-by-step problem solving with solutions
- Use **step-sequence** for ordered instructions or multi-step processes
- Use **definition** for formal mathematical terms (not plain paragraphs)
- Use **memory-trick** for mnemonics and helpful shortcuts
- Use **callout-box** for important notes, warnings, or tips
- Prefer structured components over plain paragraphs when possible

# Available Tools

## Content Management Tools
- **batch_add_components**: Add multiple components at once (efficient for PDF processing)
- **add_component**: Add a single educational component to a node
- **edit_component**: Modify existing component content or parameters
- **delete_component**: Remove components (requires confirmation from user)
- **create_relationship**: Create curriculum graph connections (LEADS_TO, PREREQUISITE, ENRICHMENT)

## Data Analysis Tools
- **execute_code**: Execute Python code to analyze curriculum data (read-only, sandboxed)

{self._build_code_execution_guide()}

When the user asks to modify content, use content management tools. When asked about patterns, statistics, or analysis, use execute_code. Always confirm actions with clear feedback."""

    # ============ File Processing Utilities ============

    def _encode_image_to_base64(self, image_data: bytes) -> str:
        """Encode image bytes to base64 string"""
        return base64.standard_b64encode(image_data).decode('utf-8')

    def _encode_pdf_to_base64(self, pdf_data: bytes) -> str:
        """Encode PDF bytes to base64 string"""
        return base64.standard_b64encode(pdf_data).decode('utf-8')

    def _convert_pdf_to_image(self, pdf_path: str, page_number: int = 1) -> bytes:
        """
        Convert PDF page to image using Vision AI's converter
        Reuses existing battle-tested conversion logic
        """
        try:
            # Import Vision AI's processor
            import sys
            sys.path.append(str(Path(__file__).parent.parent / "python-services"))
            from vision_processor import VisionProcessor

            processor = VisionProcessor()
            # Use Vision AI's proven PDF→Image conversion
            pil_image = processor._convert_pdf_page_to_image(pdf_path, page_number)

            # Convert PIL Image to bytes
            from io import BytesIO
            buffer = BytesIO()
            pil_image.save(buffer, format='JPEG', quality=85)
            return buffer.getvalue()

        except Exception as e:
            logger.error(f"PDF conversion failed: {e}")
            raise ValueError(f"Could not convert PDF to image: {str(e)}")

    def _validate_file_size(self, file_data: bytes, max_size_mb: int = 5) -> bool:
        """Validate file size is within limits"""
        size_mb = len(file_data) / (1024 * 1024)
        if size_mb > max_size_mb:
            raise ValueError(f"File size ({size_mb:.1f}MB) exceeds limit ({max_size_mb}MB)")
        return True

    async def _chat_gemini(self, user_message: str, tools: List[Dict], system_message: str,
                           file_data: Optional[Union[bytes, str]] = None, file_type: str = "pdf") -> str:
        """
        Chat with Gemini (supports image processing, PDF requires conversion)

        Args:
            user_message: Text message from user
            tools: MCP tools available
            system_message: System context
            file_data: Optional PDF or image bytes (or path for PDF)
            file_type: 'pdf' or 'image'
        """
        from google.genai import types

        # Convert MCP tools to Gemini format
        gemini_tools = self._convert_tools_to_gemini(tools)

        # Create config
        config = types.GenerateContentConfig(
            tools=gemini_tools,
            system_instruction=system_message
        )

        # Build content parts
        content_parts = []

        # Add file if provided
        if file_data:
            try:
                if file_type == "pdf":
                    # Gemini doesn't support PDF natively - convert to image first
                    # If file_data is a path string, use it directly
                    if isinstance(file_data, str):
                        pdf_path = file_data
                    else:
                        # Save bytes to temp file for conversion
                        import tempfile
                        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                            tmp.write(file_data)
                            pdf_path = tmp.name

                    # Convert PDF page to image using Vision AI's converter
                    image_bytes = self._convert_pdf_to_image(pdf_path, page_number=1)

                    # Clean up temp file if we created one
                    if not isinstance(file_data, str):
                        os.unlink(pdf_path)
                else:
                    # Direct image bytes
                    image_bytes = file_data if isinstance(file_data, bytes) else file_data.encode()

                # Validate size
                self._validate_file_size(image_bytes)

                # Add image part to Gemini message
                image_part = types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg"
                )
                content_parts.append(image_part)
                logger.info(f"Added {file_type} (as image) to Gemini message")

            except Exception as e:
                logger.error(f"Failed to process file for Gemini: {e}")
                return f"Error processing file: {str(e)}"

        # Add text part
        content_parts.append(types.Part.from_text(user_message))

        # Send message
        response = self.gemini_client.models.generate_content(
            model=self.model,
            contents=content_parts,
            config=config
        )

        # Handle tool calls
        if response.candidates and response.candidates[0].content.parts:
            part = response.candidates[0].content.parts[0]

            if hasattr(part, 'function_call') and part.function_call:
                # Execute tool
                tool_name = part.function_call.name
                tool_args = dict(part.function_call.args)

                result = await self._execute_mcp_tool(tool_name, tool_args)

                # Return result
                return result.get("content", [{}])[0].get("text", "Tool executed")

        # Return text response
        return response.text

    async def _chat_claude(self, user_message: str, tools: List[Dict], system_message: str,
                           file_data: Optional[Union[bytes, str]] = None, file_type: str = "pdf") -> str:
        """
        Chat with Claude (supports native PDF and image processing)

        Args:
            user_message: Text message from user
            tools: MCP tools available
            system_message: System context
            file_data: Optional PDF or image bytes
            file_type: 'pdf' or 'image'
        """
        # Convert MCP tools to Claude format
        claude_tools = self._convert_tools_to_claude(tools)

        # Build message content
        message_content = []

        # Add file if provided
        if file_data:
            try:
                # Validate file size
                if isinstance(file_data, bytes):
                    self._validate_file_size(file_data)
                    encoded_data = self._encode_pdf_to_base64(file_data) if file_type == "pdf" else self._encode_image_to_base64(file_data)
                else:
                    # Assume it's already base64 encoded
                    encoded_data = file_data

                # Claude's native PDF/image support
                media_type = "application/pdf" if file_type == "pdf" else "image/jpeg"
                message_content.append({
                    "type": "document" if file_type == "pdf" else "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": encoded_data
                    }
                })
                logger.info(f"Added {file_type} to Claude message")
            except Exception as e:
                logger.error(f"Failed to process file for Claude: {e}")
                return f"Error processing file: {str(e)}"

        # Add text message
        message_content.append({"type": "text", "text": user_message})

        # Send message
        response = self.claude_client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_message,
            tools=claude_tools,
            messages=[{"role": "user", "content": message_content}]
        )

        # Handle tool calls
        if response.stop_reason == "tool_use":
            for block in response.content:
                if block.type == "tool_use":
                    result = await self._execute_mcp_tool(block.name, block.input)
                    return result.get("content", [{}])[0].get("text", "Tool executed")

        # Return text response
        for block in response.content:
            if hasattr(block, "text"):
                return block.text

        return "No response"

    def _convert_tools_to_gemini(self, tools: List[Dict]) -> List:
        """Convert MCP tools to Gemini function format"""
        from google.genai import types

        gemini_functions = []
        for tool in tools:
            func_declaration = types.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=tool["inputSchema"]
            )
            gemini_functions.append(func_declaration)

        return [types.Tool(function_declarations=gemini_functions)]

    def _convert_tools_to_claude(self, tools: List[Dict]) -> List[Dict]:
        """Convert MCP tools to Claude tool format"""
        claude_tools = []
        for tool in tools:
            claude_tools.append({
                "name": tool["name"],
                "description": tool["description"],
                "input_schema": tool["inputSchema"]
            })
        return claude_tools

    async def _execute_mcp_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an MCP tool via the server"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.mcp_server_url}/mcp/tools/call",
                json={"name": name, "arguments": arguments}
            )
            return response.json()


# CLI for testing
async def main():
    import asyncio

    provider = os.getenv("DEFAULT_LLM_PROVIDER", "gemini")
    backend = LLMBackend(provider=provider)

    print(f"\n🤖 LearnLine AI Assistant ({provider.upper()})")
    print("=" * 50)
    print("Type 'exit' to quit\n")

    while True:
        user_input = input("You: ")
        if user_input.lower() in ["exit", "quit"]:
            break

        try:
            response = await backend.chat(user_input)
            print(f"\nAssistant: {response}\n")
        except Exception as e:
            print(f"\nError: {e}\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
