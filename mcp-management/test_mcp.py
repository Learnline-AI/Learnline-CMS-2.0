"""
Test script for MCP Server
Tests resources and tools without requiring LLM
"""

import asyncio
import httpx
import json

MCP_SERVER_URL = "http://localhost:8001"

async def test_health():
    """Test health endpoint"""
    print("\n🔍 Testing Health Endpoint")
    print("=" * 50)

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MCP_SERVER_URL}/health")
        data = response.json()
        print(f"Status: {data.get('status')}")
        print(f"Service: {data.get('service')}")
        print(f"Version: {data.get('version')}")
        print(f"Context: {json.dumps(data.get('context'), indent=2)}")

async def test_initialize():
    """Test MCP initialize protocol"""
    print("\n🔍 Testing MCP Initialize")
    print("=" * 50)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MCP_SERVER_URL}/mcp/initialize",
            json={}
        )
        data = response.json()
        print(json.dumps(data, indent=2))

async def test_list_resources():
    """Test listing resources"""
    print("\n🔍 Testing List Resources")
    print("=" * 50)

    async with httpx.AsyncClient() as client:
        response = await client.post(f"{MCP_SERVER_URL}/mcp/resources/list")
        data = response.json()
        resources = data.get("resources", [])
        print(f"Found {len(resources)} resources:")
        for res in resources:
            print(f"  - {res['name']}: {res['uri']}")

async def test_read_context():
    """Test reading current context"""
    print("\n🔍 Testing Read Context Resource")
    print("=" * 50)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MCP_SERVER_URL}/mcp/resources/read",
            json={"uri": "context://current"}
        )
        data = response.json()
        contents = data.get("contents", [])
        if contents:
            print(contents[0].get("text", ""))

async def test_list_tools():
    """Test listing tools"""
    print("\n🔍 Testing List Tools")
    print("=" * 50)

    async with httpx.AsyncClient() as client:
        response = await client.post(f"{MCP_SERVER_URL}/mcp/tools/list")
        data = response.json()
        tools = data.get("tools", [])
        print(f"Found {tools} tools:")
        for tool in tools:
            print(f"\n  📝 {tool['name']}")
            print(f"     {tool['description']}")
            required = tool.get('inputSchema', {}).get('required', [])
            print(f"     Required params: {', '.join(required)}")

async def test_add_component():
    """Test adding a component (requires session with node)"""
    print("\n🔍 Testing Add Component Tool")
    print("=" * 50)
    print("NOTE: This requires a valid session_id and node_id")
    print("Skipping actual execution - would call:")
    print(json.dumps({
        "name": "add_component",
        "arguments": {
            "node_id": "N002",
            "component_type": "heading",
            "parameters": {"text": "Test Heading from MCP"},
            "position": 1
        }
    }, indent=2))

async def main():
    """Run all tests"""
    print("\n" + "=" * 50)
    print("MCP Server Test Suite")
    print("=" * 50)
    print("\nMake sure the MCP server is running:")
    print("  cd mcp-management")
    print("  python mcp_server.py")
    print("\n" + "=" * 50)

    try:
        await test_health()
        await test_initialize()
        await test_list_resources()
        await test_read_context()
        await test_list_tools()
        await test_add_component()

        print("\n" + "=" * 50)
        print("✅ All tests completed!")
        print("=" * 50)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure:")
        print("  1. MCP server is running on port 8001")
        print("  2. FastAPI backend is running on port 8000")
        print("  3. Dependencies are installed: pip install -r requirements.txt")

if __name__ == "__main__":
    asyncio.run(main())
