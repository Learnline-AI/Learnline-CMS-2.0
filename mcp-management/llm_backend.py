"""
Dual LLM Backend Support
Supports both Gemini (free tier) and Claude (best quality)
"""

import os
import logging
from typing import Dict, List, Any, Optional
import httpx

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
        Send a chat message and handle tool calls

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

    def _build_system_message(self, context: str) -> str:
        """Build system message with context"""
        return f"""You are an AI assistant helping to manage an educational CMS for K-12 math lessons.

{context}

You have access to tools to:
- Add educational components (headings, paragraphs, definitions, worked examples, etc.)
- Edit existing components
- Delete components
- Create curriculum relationships between nodes

When the user asks to modify content, use the appropriate tools. Always confirm actions with clear feedback."""

    async def _chat_gemini(self, user_message: str, tools: List[Dict], system_message: str) -> str:
        """Chat with Gemini"""
        from google.genai import types

        # Convert MCP tools to Gemini format
        gemini_tools = self._convert_tools_to_gemini(tools)

        # Create config
        config = types.GenerateContentConfig(
            tools=gemini_tools,
            system_instruction=system_message
        )

        # Send message
        response = self.gemini_client.models.generate_content(
            model=self.model,
            contents=user_message,
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

    async def _chat_claude(self, user_message: str, tools: List[Dict], system_message: str) -> str:
        """Chat with Claude"""
        # Convert MCP tools to Claude format
        claude_tools = self._convert_tools_to_claude(tools)

        # Send message
        response = self.claude_client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_message,
            tools=claude_tools,
            messages=[{"role": "user", "content": user_message}]
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
