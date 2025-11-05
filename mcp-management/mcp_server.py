"""
Lightweight MCP Server for LearnLine Educational CMS
Implements the Model Context Protocol for LLM interactions with the CMS backend
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

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
                            # Chat messages will be handled by LLM integration (future)
                            logger.info(f"Chat message received: {message.get('content', '')[:50]}...")

                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON received: {data}")
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")

            except WebSocketDisconnect:
                self.websocket_clients.remove(websocket)
                logger.info(f"WebSocket client disconnected. Total clients: {len(self.websocket_clients)}")

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
