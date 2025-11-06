"""
Lightweight MCP Server for LearnLine Educational CMS
Implements the Model Context Protocol for LLM interactions with the CMS backend
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import our modules (to be created)
from mcp_context import MCPContext
from mcp_resources import MCPResources
from mcp_tools import MCPTools

class MCPServer:
    """Lightweight MCP protocol server"""

    def __init__(self):
        self.app = FastAPI(title="LearnLine MCP Server", version="1.0.0")
        self.context = MCPContext()
        self.resources = MCPResources(self.context)
        self.tools = MCPTools(self.context)
        self.websocket_clients = set()

        # Add CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        self.setup_routes()

    def setup_routes(self):
        """Set up FastAPI routes for MCP protocol"""

        @self.app.get("/health")
        async def health_check():
            return {
                "status": "healthy",
                "service": "mcp-server",
                "version": "1.0.0",
                "context": self.context.get_summary()
            }

        @self.app.post("/mcp/initialize")
        async def initialize(request: Dict[str, Any]):
            """MCP protocol: Initialize connection"""
            return {
                "protocolVersion": "1.0.0",
                "capabilities": {
                    "resources": {"supported": True},
                    "tools": {"supported": True},
                    "prompts": {"supported": False}
                },
                "serverInfo": {
                    "name": "learnline-cms",
                    "version": "1.0.0"
                }
            }

        @self.app.post("/mcp/resources/list")
        async def list_resources():
            """MCP protocol: List available resources"""
            return await self.resources.list_resources()

        @self.app.post("/mcp/resources/read")
        async def read_resource(request: Dict[str, Any]):
            """MCP protocol: Read a specific resource"""
            uri = request.get("uri")
            return await self.resources.read_resource(uri)

        @self.app.post("/mcp/tools/list")
        async def list_tools():
            """MCP protocol: List available tools"""
            return await self.tools.list_tools()

        @self.app.post("/mcp/tools/call")
        async def call_tool(request: Dict[str, Any]):
            """MCP protocol: Execute a tool"""
            name = request.get("name")
            arguments = request.get("arguments", {})

            result = await self.tools.call_tool(name, arguments)

            # Broadcast change to WebSocket clients
            await self.broadcast_change({
                "type": "tool_executed",
                "tool": name,
                "arguments": arguments,
                "result": result
            })

            # Broadcast UI refresh signal based on tool type
            refresh_message = self._determine_refresh_target(name, arguments)
            if refresh_message:
                await self.broadcast_change(refresh_message)

            return result

        @self.app.websocket("/mcp-sync")
        async def websocket_sync(websocket: WebSocket):
            """WebSocket endpoint for live frontend updates"""
            await websocket.accept()
            self.websocket_clients.add(websocket)
            logger.info(f"WebSocket client connected. Total clients: {len(self.websocket_clients)}")

            try:
                while True:
                    # Keep connection alive and receive any client messages
                    data = await websocket.receive_text()
                    logger.info(f"Received from client: {data}")

                    # Parse and process client messages
                    try:
                        message = json.loads(data)
                        message_type = message.get('type')

                        if message_type == 'context_update':
                            # Update backend context
                            context_data = message.get('context', {})
                            session_id = context_data.get('session_id')
                            node_id = context_data.get('node_id')
                            screen = context_data.get('screen', 'editor')
                            action = context_data.get('action', 'unknown')

                            # Update context instance
                            if session_id:
                                self.context.set_session(session_id)
                            if node_id:
                                self.context.set_node(node_id)
                            if screen:
                                self.context.set_screen(screen)

                            logger.info(f"Context updated: session={session_id}, node={node_id}, screen={screen}, action={action}")

                        elif message_type == 'chat_message':
                            # Handle chat messages with LLM integration
                            await self.handle_chat_message(websocket, message)

                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON received: {data}")
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")

            except WebSocketDisconnect:
                self.websocket_clients.remove(websocket)
                logger.info(f"WebSocket client disconnected. Total clients: {len(self.websocket_clients)}")

    async def handle_chat_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle chat messages with LLM integration"""
        try:
            # Extract message data
            content = message.get('content', '')
            file_data = message.get('file')  # Base64 encoded file or None
            file_name = message.get('fileName', 'unknown')

            # CRITICAL FIX: Use context from the message payload, not stored context
            # This ensures the LLM processes content for the correct node
            message_context = message.get('context', {})
            node_id = message_context.get('node_id')
            session_id = message_context.get('session_id') or self.context.session_id

            # Update stored context to match message context
            if session_id:
                self.context.set_session(session_id)
            if node_id:
                self.context.set_node(node_id)
                logger.info(f"Context updated from message: node={node_id}, session={session_id}")

            logger.info(f"Processing chat message: {content[:50]}... (file: {file_name if file_data else 'none'}, node: {node_id})")

            # Send "thinking" notification
            await websocket.send_text(json.dumps({
                'type': 'tool_start',
                'tool': 'processing_message'
            }))

            # Initialize LLM backend (use Claude for native PDF support)
            from llm_backend import LLMBackend
            llm = LLMBackend(provider="claude")

            # Route to appropriate handler
            if file_data:
                # Decode base64 file
                import base64
                file_bytes = base64.b64decode(file_data)
                logger.info(f"Processing file: {file_name} ({len(file_bytes)} bytes)")

                # Route to multimodal handler
                response = await llm.chat_with_file(content, file_bytes, session_id, file_type="auto")
            else:
                # Text-only chat
                response = await llm.chat(content, session_id)

            # Send response back to frontend
            await websocket.send_text(json.dumps({
                'type': 'ai_response',
                'content': response
            }))

            # Send completion notification
            await websocket.send_text(json.dumps({
                'type': 'tool_complete',
                'tool': 'processing_message'
            }))

            logger.info(f"Chat message processed successfully")

        except Exception as e:
            logger.error(f"Error processing chat message: {e}", exc_info=True)
            # Send error message to frontend
            await websocket.send_text(json.dumps({
                'type': 'error',
                'error': f"Error processing message: {str(e)}"
            }))

    async def broadcast_change(self, event: Dict[str, Any]):
        """Broadcast change events to all connected WebSocket clients"""
        if not self.websocket_clients:
            return

        message = json.dumps(event)
        disconnected = set()

        for client in self.websocket_clients:
            try:
                await client.send_text(message)
            except Exception as e:
                logger.error(f"Error sending to WebSocket client: {e}")
                disconnected.add(client)

        # Remove disconnected clients
        self.websocket_clients -= disconnected

    def _determine_refresh_target(self, tool_name: str, arguments: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Map tool execution to UI refresh targets

        Returns:
            Dict with refresh_ui message structure, or None if no refresh needed
        """
        # Component modification tools - refresh components panel
        if tool_name in ["add_component", "edit_component", "delete_component", "batch_add_components"]:
            node_id = arguments.get("node_id")
            if node_id:
                return {
                    "type": "refresh_ui",
                    "target": "components",
                    "node_id": node_id
                }

        # Node creation tools - refresh node list
        elif tool_name == "create_node":
            return {
                "type": "refresh_ui",
                "target": "nodes"
            }

        # Relationship tools - refresh knowledge graph
        elif tool_name == "create_relationship":
            return {
                "type": "refresh_ui",
                "target": "relationships"
            }

        # No refresh needed for other tools
        return None

    def run(self, host="0.0.0.0", port=8001):
        """Start the MCP server"""
        logger.info(f"Starting LearnLine MCP Server on {host}:{port}")
        uvicorn.run(self.app, host=host, port=port, log_level="info")

if __name__ == "__main__":
    # Get configuration from environment
    port = int(os.getenv("MCP_PORT", "8001"))

    # Create and run server
    server = MCPServer()
    server.run(port=port)
