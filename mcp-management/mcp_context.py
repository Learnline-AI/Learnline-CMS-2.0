"""
MCP Context Manager
Tracks session state, current node, screen context for LLM interactions
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MCPContext:
    """Manages context state for MCP interactions"""

    def __init__(self):
        # Session state
        self.session_id: Optional[str] = None
        self.current_node_id: Optional[str] = None
        self.current_screen: str = "content"  # 'content' or 'visual'

        # Recent actions log (for debugging and context awareness)
        self.recent_actions: List[Dict[str, Any]] = []
        self.max_actions = 50  # Keep last 50 actions

        # FastAPI backend URL
        self.backend_url = os.getenv("FASTAPI_BASE_URL", "http://localhost:8000")

        logger.info("MCPContext initialized")

    def set_session(self, session_id: str):
        """Set the current session ID"""
        old_session = self.session_id
        self.session_id = session_id
        self.log_action("set_session", {"old": old_session, "new": session_id})
        logger.info(f"Session changed: {old_session} → {session_id}")

    def set_node(self, node_id: str):
        """Set the currently selected node"""
        old_node = self.current_node_id
        self.current_node_id = node_id
        self.log_action("set_node", {"old": old_node, "new": node_id})
        logger.info(f"Node changed: {old_node} → {node_id}")

    def set_screen(self, screen: str):
        """Set the current screen (content or visual)"""
        if screen not in ["content", "visual"]:
            raise ValueError(f"Invalid screen: {screen}. Must be 'content' or 'visual'")

        old_screen = self.current_screen
        self.current_screen = screen
        self.log_action("set_screen", {"old": old_screen, "new": screen})
        logger.info(f"Screen changed: {old_screen} → {screen}")

    def log_action(self, action_name: str, details: Optional[Dict[str, Any]] = None):
        """Log an action to the recent actions list"""
        action = {
            "timestamp": datetime.now().isoformat(),
            "action": action_name,
            "details": details or {}
        }

        self.recent_actions.append(action)

        # Keep only the last N actions
        if len(self.recent_actions) > self.max_actions:
            self.recent_actions = self.recent_actions[-self.max_actions:]

    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the current context state"""
        return {
            "session_id": self.session_id,
            "current_node_id": self.current_node_id,
            "current_screen": self.current_screen,
            "backend_url": self.backend_url,
            "recent_actions_count": len(self.recent_actions),
            "last_action": self.recent_actions[-1] if self.recent_actions else None
        }

    def get_context_for_llm(self) -> str:
        """Format context as human-readable text for LLM"""
        lines = ["# Current CMS Context"]

        if self.session_id:
            lines.append(f"**Session**: {self.session_id}")
        else:
            lines.append("**Session**: No active session")

        if self.current_node_id:
            lines.append(f"**Current Node**: {self.current_node_id}")
        else:
            lines.append("**Current Node**: No node selected")

        lines.append(f"**Current Screen**: {self.current_screen}")

        if self.recent_actions:
            lines.append("\n**Recent Actions**:")
            for action in self.recent_actions[-5:]:  # Last 5 actions
                timestamp = action["timestamp"].split("T")[1][:8]  # HH:MM:SS
                lines.append(f"  - [{timestamp}] {action['action']}")

        return "\n".join(lines)

    def clear(self):
        """Clear all context state"""
        self.session_id = None
        self.current_node_id = None
        self.current_screen = "content"
        self.recent_actions = []
        logger.info("Context cleared")
