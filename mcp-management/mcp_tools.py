"""
MCP Tools
Write operations for LLM to modify CMS content
"""

import httpx
import logging
from typing import Dict, List, Any, Optional
from mcp_context import MCPContext

logger = logging.getLogger(__name__)

# Valid component types from component_schemas.py
VALID_COMPONENT_TYPES = [
    "heading", "paragraph", "definition", "memory-trick",
    "worked-example", "step-sequence", "callout-box",
    "two-pictures", "three-pictures", "four-pictures", "three-svgs", "hero-number"
]

# Valid relationship types
VALID_RELATIONSHIP_TYPES = [
    "LEADS_TO", "PREREQUISITE_FOR", "PREREQUISITE", "ENRICHMENT"
]

class MCPTools:
    """Manages write operations (tools) for MCP protocol"""

    def __init__(self, context: MCPContext):
        self.context = context

    async def list_tools(self) -> Dict[str, Any]:
        """MCP protocol: List all available tools"""
        tools = [
            {
                "name": "add_component",
                "description": "Add a new educational component to a node",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "Node ID (e.g., N002)"},
                        "component_type": {
                            "type": "string",
                            "enum": VALID_COMPONENT_TYPES,
                            "description": "Type of component to add"
                        },
                        "parameters": {
                            "type": "object",
                            "description": "Component-specific parameters (e.g., {'text': '...'} for heading)"
                        },
                        "position": {
                            "type": "integer",
                            "description": "Position to insert (1-based, optional - defaults to end)"
                        }
                    },
                    "required": ["node_id", "component_type", "parameters"]
                }
            },
            {
                "name": "edit_component",
                "description": "Edit an existing component in a node",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "Node ID"},
                        "component_order": {"type": "integer", "description": "Component position (1-based)"},
                        "new_parameters": {
                            "type": "object",
                            "description": "New parameters to merge with existing"
                        }
                    },
                    "required": ["node_id", "component_order", "new_parameters"]
                }
            },
            {
                "name": "delete_component",
                "description": "Delete a component from a node (requires confirmation)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "Node ID"},
                        "component_order": {"type": "integer", "description": "Component position to delete (1-based)"},
                        "confirm": {"type": "boolean", "description": "Must be true to confirm deletion"}
                    },
                    "required": ["node_id", "component_order"]
                }
            },
            {
                "name": "create_relationship",
                "description": "Create a curriculum relationship between two nodes",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "session_id": {"type": "string", "description": "Session ID"},
                        "from_node_id": {"type": "string", "description": "Source node ID"},
                        "to_node_id": {"type": "string", "description": "Target node ID"},
                        "relationship_type": {
                            "type": "string",
                            "enum": VALID_RELATIONSHIP_TYPES,
                            "description": "Type of relationship",
                            "default": "LEADS_TO"
                        },
                        "explanation": {"type": "string", "description": "Optional explanation"}
                    },
                    "required": ["session_id", "from_node_id", "to_node_id"]
                }
            }
        ]

        return {"tools": tools}

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """MCP protocol: Execute a tool"""
        logger.info(f"Calling tool: {name} with arguments: {arguments}")

        try:
            if name == "add_component":
                return await self._add_component(arguments)
            elif name == "edit_component":
                return await self._edit_component(arguments)
            elif name == "delete_component":
                return await self._delete_component(arguments)
            elif name == "create_relationship":
                return await self._create_relationship(arguments)
            else:
                return {"content": [{"type": "text", "text": f"Unknown tool: {name}"}], "isError": True}
        except Exception as e:
            logger.error(f"Error executing tool {name}: {e}")
            return {"content": [{"type": "text", "text": f"Error: {str(e)}"}], "isError": True}

    async def _add_component(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new component to a node"""
        node_id = args["node_id"]
        component_type = args["component_type"]
        parameters = args["parameters"]
        position = args.get("position")

        # Validate component type
        if component_type not in VALID_COMPONENT_TYPES:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Invalid component type: {component_type}. Valid types: {', '.join(VALID_COMPONENT_TYPES)}"
                }],
                "isError": True
            }

        # Get current components
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.context.backend_url}/nodes/{node_id}/components")
            current_data = response.json()

        current_components = current_data.get("components", [])
        suggested_template = current_data.get("suggested_template", "text-heavy")
        overall_confidence = current_data.get("overall_confidence", 0.8)

        # Determine position
        if position is None:
            position = len(current_components) + 1
        else:
            position = max(1, min(position, len(current_components) + 1))

        # Create new component
        new_component = {
            "type": component_type,
            "order": position,
            "parameters": parameters,
            "confidence": 0.9
        }

        # Insert at position and reorder
        components_list = [
            {"type": c["type"], "order": c["order"], "parameters": c["parameters"], "confidence": c.get("confidence", 0.8)}
            for c in current_components
        ]
        components_list.insert(position - 1, new_component)

        # Reorder
        for i, comp in enumerate(components_list, start=1):
            comp["order"] = i

        # Save updated sequence
        async with httpx.AsyncClient() as client:
            save_response = await client.post(
                f"{self.context.backend_url}/nodes/{node_id}/components",
                json={
                    "node_id": node_id,
                    "components": components_list,
                    "suggested_template": suggested_template,
                    "overall_confidence": overall_confidence
                }
            )

        self.context.log_action("add_component", {"node_id": node_id, "type": component_type, "position": position})

        return {
            "content": [{
                "type": "text",
                "text": f"✓ Added {component_type} component to node {node_id} at position {position}. Total components: {len(components_list)}"
            }]
        }

    async def _edit_component(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Edit an existing component"""
        node_id = args["node_id"]
        component_order = args["component_order"]
        new_parameters = args["new_parameters"]

        # Get current components
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.context.backend_url}/nodes/{node_id}/components")
            current_data = response.json()

        current_components = current_data.get("components", [])

        # Find the component
        target_component = None
        for comp in current_components:
            if comp["order"] == component_order:
                target_component = comp
                break

        if not target_component:
            return {
                "content": [{"type": "text", "text": f"Component at position {component_order} not found in node {node_id}"}],
                "isError": True
            }

        # Merge parameters
        merged_parameters = {**target_component["parameters"], **new_parameters}

        # Update via API
        async with httpx.AsyncClient() as client:
            update_response = await client.put(
                f"{self.context.backend_url}/nodes/{node_id}/components/{component_order}",
                json={
                    "type": target_component["type"],
                    "order": component_order,
                    "parameters": merged_parameters,
                    "confidence": target_component.get("confidence", 0.8)
                }
            )

        self.context.log_action("edit_component", {"node_id": node_id, "order": component_order, "changes": list(new_parameters.keys())})

        return {
            "content": [{
                "type": "text",
                "text": f"✓ Updated {target_component['type']} component at position {component_order} in node {node_id}"
            }]
        }

    async def _delete_component(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a component (with confirmation)"""
        node_id = args["node_id"]
        component_order = args["component_order"]
        confirm = args.get("confirm", False)

        if not confirm:
            return {
                "content": [{
                    "type": "text",
                    "text": f"⚠️  Deletion requires confirmation. To proceed, call this tool again with confirm=true"
                }]
            }

        # Delete via API
        async with httpx.AsyncClient() as client:
            response = await client.delete(f"{self.context.backend_url}/nodes/{node_id}/components/{component_order}")
            result = response.json()

        remaining = result.get("remaining_components", "unknown")
        self.context.log_action("delete_component", {"node_id": node_id, "order": component_order})

        return {
            "content": [{
                "type": "text",
                "text": f"✓ Deleted component {component_order} from node {node_id}. Remaining components: {remaining}"
            }]
        }

    async def _create_relationship(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Create a relationship between nodes"""
        session_id = args["session_id"]
        from_node_id = args["from_node_id"]
        to_node_id = args["to_node_id"]
        relationship_type = args.get("relationship_type", "LEADS_TO")
        explanation = args.get("explanation", "")

        # Validate relationship type
        if relationship_type not in VALID_RELATIONSHIP_TYPES:
            return {
                "content": [{
                    "type": "text",
                    "text": f"Invalid relationship type: {relationship_type}. Valid types: {', '.join(VALID_RELATIONSHIP_TYPES)}"
                }],
                "isError": True
            }

        # Create via API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.context.backend_url}/session/{session_id}/relationships",
                json={
                    "from_node_id": from_node_id,
                    "to_node_id": to_node_id,
                    "relationship_type": relationship_type,
                    "explanation": explanation,
                    "created_by": "MCP_LLM",
                    "confidence_score": 0.9
                }
            )

        self.context.log_action("create_relationship", {"from": from_node_id, "to": to_node_id, "type": relationship_type})

        return {
            "content": [{
                "type": "text",
                "text": f"✓ Created {relationship_type} relationship: {from_node_id} → {to_node_id}" + (f" ({explanation})" if explanation else "")
            }]
        }
