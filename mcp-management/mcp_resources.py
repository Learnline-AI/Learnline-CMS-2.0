"""
MCP Resources
Read-only data exposure for LLM to understand CMS state
"""

import httpx
import logging
from typing import Dict, List, Any, Optional
from mcp_context import MCPContext

logger = logging.getLogger(__name__)

class MCPResources:
    """Manages read-only resources for MCP protocol"""

    def __init__(self, context: MCPContext):
        self.context = context

    async def list_resources(self) -> Dict[str, Any]:
        """MCP protocol: List all available resources"""
        resources = []

        # Resource 1: Session nodes
        if self.context.session_id:
            resources.append({
                "uri": f"session://{self.context.session_id}/nodes",
                "name": "Session Nodes",
                "description": "List of all nodes in the current session",
                "mimeType": "text/plain"
            })

        # Resource 2: Current node components
        if self.context.current_node_id:
            resources.append({
                "uri": f"node://{self.context.current_node_id}/components",
                "name": "Node Components",
                "description": f"Component sequence for node {self.context.current_node_id}",
                "mimeType": "text/plain"
            })

        # Resource 3: Session relationships
        if self.context.session_id:
            resources.append({
                "uri": f"session://{self.context.session_id}/relationships",
                "name": "Knowledge Graph Relationships",
                "description": "All curriculum relationships in this session",
                "mimeType": "text/plain"
            })

        # Always available: Context summary
        resources.append({
            "uri": "context://current",
            "name": "Current Context",
            "description": "Current session, node, and screen state",
            "mimeType": "text/plain"
        })

        return {"resources": resources}

    async def read_resource(self, uri: str) -> Dict[str, Any]:
        """MCP protocol: Read a specific resource"""
        logger.info(f"Reading resource: {uri}")

        try:
            if uri.startswith("session://") and uri.endswith("/nodes"):
                return await self._read_session_nodes(uri)
            elif uri.startswith("node://") and "/components" in uri:
                return await self._read_node_components(uri)
            elif uri.startswith("session://") and uri.endswith("/relationships"):
                return await self._read_session_relationships(uri)
            elif uri == "context://current":
                return await self._read_current_context()
            else:
                return {
                    "contents": [{"uri": uri, "mimeType": "text/plain", "text": f"Unknown resource: {uri}"}]
                }
        except Exception as e:
            logger.error(f"Error reading resource {uri}: {e}")
            return {
                "contents": [{"uri": uri, "mimeType": "text/plain", "text": f"Error: {str(e)}"}]
            }

    async def _read_session_nodes(self, uri: str) -> Dict[str, Any]:
        """Read session nodes resource"""
        session_id = uri.split("://")[1].split("/")[0]

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.context.backend_url}/session/{session_id}/nodes")
            data = response.json()

        nodes = data.get("nodes", [])
        total = data.get("total", 0)

        # Format as readable text
        lines = [f"# Session Nodes ({total} total)\n"]

        if not nodes:
            lines.append("No nodes found in this session.")
        else:
            for node in nodes:
                node_id = node.get("node_id", "Unknown")
                title = node.get("title", "Untitled")
                lines.append(f"- **{node_id}**: {title}")

        text = "\n".join(lines)
        return {"contents": [{"uri": uri, "mimeType": "text/plain", "text": text}]}

    async def _read_node_components(self, uri: str) -> Dict[str, Any]:
        """Read node components resource"""
        node_id = uri.split("://")[1].split("/")[0]

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.context.backend_url}/nodes/{node_id}/components")
            data = response.json()

        components = data.get("components", [])
        total = data.get("total_components", 0)
        template = data.get("suggested_template", "text-heavy")

        # Format as readable text
        lines = [f"# Node {node_id} Components ({total} total)\n"]
        lines.append(f"**Template**: {template}\n")

        if not components:
            lines.append("No components found for this node.")
        else:
            for comp in components:
                order = comp.get("order", 0)
                comp_type = comp.get("type", "unknown")
                params = comp.get("parameters", {})

                lines.append(f"\n## Component {order}: {comp_type}")

                # Format parameters based on type
                if comp_type == "heading":
                    lines.append(f"Text: {params.get('text', '')}")
                elif comp_type == "paragraph":
                    text = params.get("text", "")
                    preview = text[:100] + "..." if len(text) > 100 else text
                    lines.append(f"Text: {preview}")
                elif comp_type == "definition":
                    lines.append(f"Term: {params.get('term', '')}")
                    lines.append(f"Definition: {params.get('definition', '')}")
                elif comp_type == "worked-example":
                    lines.append(f"Problem: {params.get('problem', '')}")
                    lines.append(f"Answer: {params.get('answer', '')}")
                else:
                    lines.append(f"Parameters: {params}")

        text = "\n".join(lines)
        return {"contents": [{"uri": uri, "mimeType": "text/plain", "text": text}]}

    async def _read_session_relationships(self, uri: str) -> Dict[str, Any]:
        """Read session relationships resource"""
        session_id = uri.split("://")[1].split("/")[0]

        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.context.backend_url}/session/{session_id}/relationships")
            data = response.json()

        relationships = data.get("relationships", [])
        total = data.get("total", 0)

        # Format as readable text
        lines = [f"# Knowledge Graph Relationships ({total} total)\n"]

        if not relationships:
            lines.append("No relationships found in this session.")
        else:
            # Group by type
            by_type = {}
            for rel in relationships:
                rel_type = rel.get("relationship_type", "UNKNOWN")
                if rel_type not in by_type:
                    by_type[rel_type] = []
                by_type[rel_type].append(rel)

            for rel_type, rels in by_type.items():
                lines.append(f"\n## {rel_type} relationships ({len(rels)})")
                for rel in rels:
                    from_node = rel.get("from_node_id", "?")
                    to_node = rel.get("to_node_id", "?")
                    explanation = rel.get("explanation", "")
                    if explanation:
                        lines.append(f"- {from_node} → {to_node}: {explanation}")
                    else:
                        lines.append(f"- {from_node} → {to_node}")

        text = "\n".join(lines)
        return {"contents": [{"uri": uri, "mimeType": "text/plain", "text": text}]}

    async def _read_current_context(self) -> Dict[str, Any]:
        """Read current context resource"""
        text = self.context.get_context_for_llm()
        return {"contents": [{"uri": "context://current", "mimeType": "text/plain", "text": text}]}
