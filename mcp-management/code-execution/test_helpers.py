"""
Test Script for Code Helper Functions
Week 1: Docker Environment + Helper Functions

This script tests all 4 helper functions to verify they work correctly
before integrating with the code executor in Week 2.

Usage:
    # From host machine:
    python3 test_helpers.py <session_id>

    # From Docker:
    docker run --rm \
      -e FASTAPI_URL=http://host.docker.internal:8000 \
      -v $(pwd):/app \
      cms-code-executor python test_helpers.py <session_id>

Example:
    python3 test_helpers.py abc123-456def-789ghi
"""

import sys
import os
from typing import Dict, Any

# Import helper functions
try:
    from code_helpers import (
        get_nodes,
        get_relationships,
        get_node_content,
        analyze_graph,
        FASTAPI_URL
    )
except ImportError as e:
    print(f"❌ Failed to import code_helpers: {e}")
    print("Make sure code_helpers.py is in the same directory")
    sys.exit(1)


def print_header(title: str):
    """Print a formatted section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)


def print_success(message: str):
    """Print a success message"""
    print(f"✅ {message}")


def print_error(message: str):
    """Print an error message"""
    print(f"❌ {message}")


def print_info(message: str):
    """Print an info message"""
    print(f"ℹ️  {message}")


def test_get_nodes(session_id: str) -> Dict[str, Any]:
    """Test get_nodes function"""
    print_header("TEST 1: get_nodes()")

    try:
        print(f"Calling get_nodes('{session_id}')...")
        nodes = get_nodes(session_id)

        if not isinstance(nodes, list):
            print_error(f"Expected list, got {type(nodes)}")
            return {"passed": False, "error": "Invalid return type"}

        print_success(f"Fetched {len(nodes)} nodes")

        if nodes:
            print_info("Sample node structure:")
            sample_node = nodes[0]
            for key in ['node_id', 'title', 'content_category', 'session_id']:
                value = sample_node.get(key, 'N/A')
                print(f"  - {key}: {value}")

        return {"passed": True, "count": len(nodes), "nodes": nodes}

    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return {"passed": False, "error": str(e)}


def test_get_relationships(session_id: str) -> Dict[str, Any]:
    """Test get_relationships function"""
    print_header("TEST 2: get_relationships()")

    try:
        print(f"Calling get_relationships('{session_id}')...")
        relationships = get_relationships(session_id)

        if not isinstance(relationships, list):
            print_error(f"Expected list, got {type(relationships)}")
            return {"passed": False, "error": "Invalid return type"}

        print_success(f"Fetched {len(relationships)} relationships")

        if relationships:
            print_info("Sample relationship structure:")
            sample_rel = relationships[0]
            for key in ['from_node_id', 'to_node_id', 'relationship_type', 'explanation']:
                value = sample_rel.get(key, 'N/A')
                print(f"  - {key}: {value}")

        return {"passed": True, "count": len(relationships), "relationships": relationships}

    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return {"passed": False, "error": str(e)}


def test_get_node_content(session_id: str, nodes: list) -> Dict[str, Any]:
    """Test get_node_content function"""
    print_header("TEST 3: get_node_content()")

    if not nodes:
        print_info("No nodes available to test get_node_content()")
        return {"passed": True, "skipped": True}

    try:
        first_node_id = nodes[0]['node_id']
        print(f"Calling get_node_content('{first_node_id}')...")
        content = get_node_content(first_node_id)

        if not isinstance(content, dict):
            print_error(f"Expected dict, got {type(content)}")
            return {"passed": False, "error": "Invalid return type"}

        components = content.get('components', [])
        print_success(f"Fetched node {first_node_id} with {len(components)} components")

        if components:
            print_info("Sample component structure:")
            sample_component = components[0]
            for key in ['component_type', 'order_index', 'confidence']:
                value = sample_component.get(key, 'N/A')
                print(f"  - {key}: {value}")

        return {"passed": True, "component_count": len(components)}

    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return {"passed": False, "error": str(e)}


def test_analyze_graph(session_id: str) -> Dict[str, Any]:
    """Test analyze_graph function"""
    print_header("TEST 4: analyze_graph()")

    try:
        print(f"Calling analyze_graph('{session_id}')...")
        G = analyze_graph(session_id)

        # Check if it's a NetworkX graph
        try:
            node_count = G.number_of_nodes()
            edge_count = G.number_of_edges()
        except AttributeError:
            print_error("Return value is not a NetworkX graph")
            return {"passed": False, "error": "Invalid return type"}

        print_success(f"Built graph with {node_count} nodes and {edge_count} edges")

        # Test graph properties
        if node_count > 0:
            print_info("Graph properties:")
            print(f"  - Nodes: {node_count}")
            print(f"  - Edges: {edge_count}")
            print(f"  - Directed: {G.is_directed()}")

            # Show sample nodes
            sample_nodes = list(G.nodes())[:3]
            print(f"  - Sample node IDs: {sample_nodes}")

        return {"passed": True, "nodes": node_count, "edges": edge_count}

    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return {"passed": False, "error": str(e)}


def run_all_tests(session_id: str):
    """Run all tests and print summary"""
    print_header("STARTING CODE HELPER FUNCTION TESTS")
    print_info(f"FastAPI URL: {FASTAPI_URL}")
    print_info(f"Session ID: {session_id}")

    results = {
        "test1_get_nodes": None,
        "test2_get_relationships": None,
        "test3_get_node_content": None,
        "test4_analyze_graph": None
    }

    # Test 1: get_nodes
    results["test1_get_nodes"] = test_get_nodes(session_id)

    # Test 2: get_relationships
    results["test2_get_relationships"] = test_get_relationships(session_id)

    # Test 3: get_node_content (needs nodes from test 1)
    nodes = results["test1_get_nodes"].get("nodes", []) if results["test1_get_nodes"]["passed"] else []
    results["test3_get_node_content"] = test_get_node_content(session_id, nodes)

    # Test 4: analyze_graph
    results["test4_analyze_graph"] = test_analyze_graph(session_id)

    # Print summary
    print_header("TEST SUMMARY")

    passed_count = sum(1 for r in results.values() if r["passed"])
    total_count = len(results)

    for test_name, result in results.items():
        status = "✅ PASSED" if result["passed"] else "❌ FAILED"
        error = f" - {result['error']}" if not result["passed"] and "error" in result else ""
        print(f"{test_name}: {status}{error}")

    print("\n" + "="*70)
    print(f"RESULTS: {passed_count}/{total_count} tests passed")

    if passed_count == total_count:
        print_success("ALL TESTS PASSED - Helper functions are working correctly!")
        print_info("You can proceed to Week 2: Code Executor")
        return 0
    else:
        print_error("SOME TESTS FAILED - Please review errors above")
        print_info("Common issues:")
        print_info("  - FastAPI backend not running (start with: uvicorn main:app)")
        print_info("  - Invalid session ID (create a session in the CMS)")
        print_info("  - Network connectivity (Docker can't reach host.docker.internal:8000)")
        return 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 test_helpers.py <session_id>")
        print("\nExample:")
        print("  python3 test_helpers.py abc123-456def-789ghi")
        print("\nTo test from Docker:")
        print("  docker run --rm \\")
        print("    -e FASTAPI_URL=http://host.docker.internal:8000 \\")
        print("    -v $(pwd):/app \\")
        print("    cms-code-executor python test_helpers.py <session_id>")
        sys.exit(1)

    session_id = sys.argv[1]
    exit_code = run_all_tests(session_id)
    sys.exit(exit_code)
