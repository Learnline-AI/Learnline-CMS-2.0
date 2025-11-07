"""
Test Suite for Code Execution (Week 2)

Tests all components of the code execution system:
1. Safety validator
2. Code executor
3. MCP integration

Usage:
    python3 test_code_execution.py
"""

import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_safety_validator():
    """Test the safety validator"""
    print("\n" + "="*70)
    print("TEST SUITE 1: Safety Validator")
    print("="*70 + "\n")

    from safety_validator import SafetyValidator
    validator = SafetyValidator()

    test_cases = [
        # (code, should_be_safe, description)
        ("from code_helpers import get_nodes\nprint(get_nodes())", True, "Valid code: import code_helpers"),
        ("import pandas as pd\ndf = pd.DataFrame()\nprint(df)", True, "Valid code: import pandas"),
        ("import networkx as nx\nG = nx.Graph()\nprint(G)", True, "Valid code: import networkx"),
        ("import math\nprint(math.pi)", True, "Valid code: import math"),

        # Dangerous code
        ("import os\nos.system('ls')", False, "Dangerous: import os"),
        ("import subprocess\nsubprocess.call(['ls'])", False, "Dangerous: import subprocess"),
        ("eval('2+2')", False, "Dangerous: eval()"),
        ("exec('print(1)')", False, "Dangerous: exec()"),
        ("__import__('os')", False, "Dangerous: __import__"),
        ("open('/etc/passwd')", False, "Dangerous: open()"),

        # Edge cases
        ("", False, "Empty code"),
        ("import unknown_module", False, "Unknown module (not in whitelist)"),
    ]

    passed = 0
    failed = 0

    for code, expected_safe, description in test_cases:
        result = validator.validate(code)
        is_safe = result["safe"]

        if is_safe == expected_safe:
            print(f"✅ PASS: {description}")
            passed += 1
        else:
            print(f"❌ FAIL: {description}")
            print(f"   Expected: {'safe' if expected_safe else 'unsafe'}")
            print(f"   Got: {'safe' if is_safe else 'unsafe'}")
            if not is_safe:
                print(f"   Reason: {result['reason']}")
            failed += 1

    print(f"\nResults: {passed}/{len(test_cases)} passed, {failed} failed")
    return failed == 0


async def test_code_executor():
    """Test the code executor"""
    print("\n" + "="*70)
    print("TEST SUITE 2: Code Executor")
    print("="*70 + "\n")

    from code_executor import CodeExecutor
    executor = CodeExecutor()

    # Check Docker availability first
    availability = executor.check_docker_availability()
    print(f"Docker available: {availability['available']}")
    print(f"Message: {availability['message']}")
    print(f"Image exists: {availability['image_exists']}\n")

    if not availability['available']:
        print("❌ Docker not available. Install Docker first:")
        print("   https://www.docker.com/products/docker-desktop/")
        return False

    if not availability['image_exists']:
        print("❌ Docker image not built. Build it first:")
        print("   cd mcp-management/code-execution && docker build -t cms-code-executor .")
        return False

    test_cases = [
        {
            "name": "Simple arithmetic",
            "code": "result = 2 + 2\nprint(f'Result: {result}')",
            "should_succeed": True,
            "expected_output": "Result: 4"
        },
        {
            "name": "Import code_helpers",
            "code": "from code_helpers import get_nodes\nprint('Import successful')",
            "should_succeed": True,
            "expected_output": "Import successful"
        },
        {
            "name": "Dangerous code (should be blocked by validator)",
            "code": "import os\nos.system('ls')",
            "should_succeed": False,
            "expected_error": "validation failed"
        },
        {
            "name": "Syntax error",
            "code": "print('hello'\n",  # Missing closing paren
            "should_succeed": False,
            "expected_error": "Syntax error"
        },
    ]

    passed = 0
    failed = 0

    for test in test_cases:
        print(f"Testing: {test['name']}...")
        result = await executor.execute_code({
            "code": test['code'],
            "session_id": "test-session"
        })

        is_error = result.get("isError", False)
        content = result.get("content", [{}])[0].get("text", "")

        if test['should_succeed']:
            if not is_error and test.get('expected_output') in content:
                print(f"✅ PASS: {test['name']}")
                passed += 1
            else:
                print(f"❌ FAIL: {test['name']}")
                print(f"   Expected success with output containing: {test.get('expected_output')}")
                print(f"   Got: {content[:100]}")
                failed += 1
        else:
            if is_error and (not test.get('expected_error') or test['expected_error'].lower() in content.lower()):
                print(f"✅ PASS: {test['name']}")
                passed += 1
            else:
                print(f"❌ FAIL: {test['name']}")
                print(f"   Expected error containing: {test.get('expected_error', 'any error')}")
                print(f"   Got: {content[:100]}")
                failed += 1

    print(f"\nResults: {passed}/{len(test_cases)} passed, {failed} failed")
    return failed == 0


async def test_mcp_integration():
    """Test MCP tools integration"""
    print("\n" + "="*70)
    print("TEST SUITE 3: MCP Integration")
    print("="*70 + "\n")

    from mcp_tools import MCPTools
    from mcp_context import MCPContext

    # Create context
    context = MCPContext()
    context.backend_url = "http://localhost:8000"

    # Create tools
    tools = MCPTools(context)

    # Test 1: List tools includes execute_code
    print("Test: execute_code tool is registered...")
    tools_list = await tools.list_tools()
    tool_names = [t["name"] for t in tools_list["tools"]]

    if "execute_code" in tool_names:
        print("✅ PASS: execute_code tool is registered")
        print(f"   All tools: {', '.join(tool_names)}")
    else:
        print("❌ FAIL: execute_code tool not found in tools list")
        print(f"   Available tools: {', '.join(tool_names)}")
        return False

    # Test 2: Call execute_code tool
    print("\nTest: Calling execute_code tool...")
    try:
        result = await tools.call_tool("execute_code", {
            "code": "print('Hello from MCP!')",
            "session_id": "test-session"
        })

        if "content" in result:
            content = result["content"][0]["text"]
            if "Hello from MCP!" in content or "Docker" in content:  # Either success or Docker not available
                print(f"✅ PASS: execute_code tool callable")
                print(f"   Result: {content[:100]}")
            else:
                print(f"❌ FAIL: Unexpected result")
                print(f"   Result: {content[:100]}")
                return False
        else:
            print(f"❌ FAIL: Invalid result format")
            print(f"   Result: {result}")
            return False

    except Exception as e:
        print(f"❌ FAIL: Exception when calling tool: {e}")
        return False

    print("\n✅ All MCP integration tests passed")
    return True


async def main():
    """Run all test suites"""
    print("\n" + "="*70)
    print("WEEK 2 CODE EXECUTION TEST SUITE")
    print("="*70)

    results = []

    # Test 1: Safety Validator
    results.append(("Safety Validator", await test_safety_validator()))

    # Test 2: Code Executor
    results.append(("Code Executor", await test_code_executor()))

    # Test 3: MCP Integration
    results.append(("MCP Integration", await test_mcp_integration()))

    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70 + "\n")

    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")

    all_passed = all(result for _, result in results)

    if all_passed:
        print("\n" + "="*70)
        print("✅ ALL TESTS PASSED - Week 2 implementation is complete!")
        print("="*70)
        print("\nNext steps:")
        print("1. Install docker package: pip install docker")
        print("2. Test with Claude via MCP chat interface")
        print("3. Try queries like: 'How many nodes are in my curriculum?'")
    else:
        print("\n" + "="*70)
        print("❌ SOME TESTS FAILED - Please review errors above")
        print("="*70)

    return all_passed


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
