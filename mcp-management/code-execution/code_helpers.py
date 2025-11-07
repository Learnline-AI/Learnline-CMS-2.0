"""
Code Helper Functions for CMS Code Execution Environment
Week 1: Docker Environment + Helper Functions

These functions provide safe, read-only access to the CMS data via FastAPI.
They are designed to be called from Claude-generated code running in Docker.

Available Functions:
- get_nodes(session_id): Fetch all nodes in a session
- get_relationships(session_id): Fetch all relationships in a session
- get_node_content(node_id): Fetch full node content with components
- analyze_graph(session_id): Build NetworkX graph for analysis

Environment Variables:
- FASTAPI_URL: Base URL for FastAPI backend (default: http://host.docker.internal:8000)
- SESSION_ID: Current session ID (injected by executor in Week 2)
"""

import os
import requests
from typing import Dict, List, Any, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI base URL (Docker → Mac host)
FASTAPI_URL = os.getenv('FASTAPI_URL', 'http://host.docker.internal:8000')

# Session ID (will be injected by code executor in Week 2)
# For Week 1 testing, pass as function parameter
SESSION_ID = os.getenv('SESSION_ID', None)


def get_nodes(session_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all nodes in a session.

    Args:
        session_id: Session ID (optional if SESSION_ID env var is set)

    Returns:
        List of node dictionaries with structure:
        [
            {
                "node_id": "N001",
                "title": "Introduction to Fractions",
                "content_category": "Explanation",
                "session_id": "abc123",
                ...
            },
            ...
        ]

    Raises:
        ValueError: If session_id is not provided
        requests.RequestException: If API call fails
    """
    # Use provided session_id or fall back to environment variable
    sid = session_id or SESSION_ID
    if not sid:
        raise ValueError("session_id must be provided or SESSION_ID env var must be set")

    url = f"{FASTAPI_URL}/session/{sid}/nodes"
    logger.info(f"Fetching nodes from: {url}")

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()
        # FastAPI returns {"session_id": "...", "nodes": [...]}
        # Extract just the nodes array
        nodes = data.get("nodes", []) if isinstance(data, dict) else data
        logger.info(f"Successfully fetched {len(nodes)} nodes")
        return nodes

    except requests.RequestException as e:
        logger.error(f"Failed to fetch nodes: {e}")
        raise


def get_relationships(session_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all relationships in a session.

    Args:
        session_id: Session ID (optional if SESSION_ID env var is set)

    Returns:
        List of relationship dictionaries with structure:
        [
            {
                "from_node_id": "N001",
                "to_node_id": "N002",
                "relationship_type": "LEADS_TO",
                "explanation": "...",
                "session_id": "abc123",
                ...
            },
            ...
        ]

    Raises:
        ValueError: If session_id is not provided
        requests.RequestException: If API call fails
    """
    # Use provided session_id or fall back to environment variable
    sid = session_id or SESSION_ID
    if not sid:
        raise ValueError("session_id must be provided or SESSION_ID env var must be set")

    url = f"{FASTAPI_URL}/session/{sid}/relationships"
    logger.info(f"Fetching relationships from: {url}")

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()
        # FastAPI returns {"session_id": "...", "relationships": [...]}
        # Extract just the relationships array
        relationships = data.get("relationships", []) if isinstance(data, dict) else data
        logger.info(f"Successfully fetched {len(relationships)} relationships")
        return relationships

    except requests.RequestException as e:
        logger.error(f"Failed to fetch relationships: {e}")
        raise


def get_node_content(node_id: str) -> Dict[str, Any]:
    """
    Fetch full node content including all components.

    Args:
        node_id: Node ID (e.g., "N001")

    Returns:
        Dictionary with structure:
        {
            "node_id": "N001",
            "components": [
                {
                    "component_type": "heading",
                    "parameters": {"text": "..."},
                    "order_index": 1,
                    "confidence": 0.8
                },
                ...
            ]
        }

    Raises:
        ValueError: If node_id is empty
        requests.RequestException: If API call fails
    """
    if not node_id:
        raise ValueError("node_id must be provided")

    url = f"{FASTAPI_URL}/nodes/{node_id}/components"
    logger.info(f"Fetching node content from: {url}")

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.json()
        logger.info(f"Successfully fetched node {node_id} with {len(data.get('components', []))} components")
        return data

    except requests.RequestException as e:
        logger.error(f"Failed to fetch node content: {e}")
        raise


def analyze_graph(session_id: Optional[str] = None):
    """
    Build NetworkX directed graph from session data for analysis.

    This function fetches nodes and relationships, then constructs
    a NetworkX DiGraph object that can be used for graph algorithms
    (shortest paths, cycles, centrality, etc.).

    Args:
        session_id: Session ID (optional if SESSION_ID env var is set)

    Returns:
        networkx.DiGraph object with:
        - Nodes: node_id as identifier, all node data as attributes
        - Edges: from_node_id → to_node_id, all relationship data as attributes

    Example Usage:
        >>> G = analyze_graph('abc123')
        >>> print(f"Graph has {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")
        >>> import networkx as nx
        >>> path = nx.shortest_path(G, 'N001', 'N010')
        >>> print(f"Shortest path: {path}")

    Raises:
        ValueError: If session_id is not provided
        requests.RequestException: If API call fails
        ImportError: If networkx is not installed
    """
    try:
        import networkx as nx
    except ImportError:
        raise ImportError("NetworkX is required for graph analysis. Install with: pip install networkx")

    # Use provided session_id or fall back to environment variable
    sid = session_id or SESSION_ID
    if not sid:
        raise ValueError("session_id must be provided or SESSION_ID env var must be set")

    logger.info(f"Building graph for session: {sid}")

    # Fetch data
    nodes = get_nodes(sid)
    relationships = get_relationships(sid)

    # Build graph
    G = nx.DiGraph()

    # Add nodes with all attributes
    for node in nodes:
        node_id = node.get('node_id')
        if node_id:
            G.add_node(node_id, **node)
            logger.debug(f"Added node: {node_id}")

    # Add edges with all attributes
    for rel in relationships:
        from_node = rel.get('from_node_id')
        to_node = rel.get('to_node_id')
        if from_node and to_node:
            G.add_edge(from_node, to_node, **rel)
            logger.debug(f"Added edge: {from_node} → {to_node}")

    logger.info(f"Graph built successfully: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    return G


# Test function (for development/debugging)
def test_helpers(session_id: str) -> Dict[str, Any]:
    """
    Test all helper functions with a given session ID.

    Args:
        session_id: Session ID to test with

    Returns:
        Dictionary with test results
    """
    results = {
        "session_id": session_id,
        "tests_passed": [],
        "tests_failed": [],
        "summary": {}
    }

    # Test get_nodes
    try:
        nodes = get_nodes(session_id)
        results["tests_passed"].append("get_nodes")
        results["summary"]["node_count"] = len(nodes)
    except Exception as e:
        results["tests_failed"].append(f"get_nodes: {str(e)}")

    # Test get_relationships
    try:
        rels = get_relationships(session_id)
        results["tests_passed"].append("get_relationships")
        results["summary"]["relationship_count"] = len(rels)
    except Exception as e:
        results["tests_failed"].append(f"get_relationships: {str(e)}")

    # Test get_node_content (if nodes exist)
    if results["summary"].get("node_count", 0) > 0:
        try:
            nodes = get_nodes(session_id)
            first_node_id = nodes[0]['node_id']
            content = get_node_content(first_node_id)
            results["tests_passed"].append("get_node_content")
            results["summary"]["first_node_components"] = len(content.get('components', []))
        except Exception as e:
            results["tests_failed"].append(f"get_node_content: {str(e)}")

    # Test analyze_graph
    try:
        G = analyze_graph(session_id)
        results["tests_passed"].append("analyze_graph")
        results["summary"]["graph_nodes"] = G.number_of_nodes()
        results["summary"]["graph_edges"] = G.number_of_edges()
    except Exception as e:
        results["tests_failed"].append(f"analyze_graph: {str(e)}")

    return results


if __name__ == "__main__":
    # Example usage for testing
    import sys

    if len(sys.argv) > 1:
        test_session_id = sys.argv[1]
        print(f"Testing helpers with session ID: {test_session_id}")
        results = test_helpers(test_session_id)

        print("\n" + "="*60)
        print("TEST RESULTS")
        print("="*60)
        print(f"\nSession ID: {results['session_id']}")
        print(f"\nTests Passed ({len(results['tests_passed'])}):")
        for test in results['tests_passed']:
            print(f"  ✓ {test}")

        if results['tests_failed']:
            print(f"\nTests Failed ({len(results['tests_failed'])}):")
            for test in results['tests_failed']:
                print(f"  ✗ {test}")

        print(f"\nSummary:")
        for key, value in results['summary'].items():
            print(f"  {key}: {value}")

        print("\n" + "="*60)

        if not results['tests_failed']:
            print("✅ ALL TESTS PASSED")
        else:
            print("❌ SOME TESTS FAILED")
            sys.exit(1)
    else:
        print("Usage: python code_helpers.py <session_id>")
        print("Example: python code_helpers.py abc123")
        sys.exit(1)
