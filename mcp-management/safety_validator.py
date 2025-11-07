"""
Safety Validator for Code Execution
Week 2: Code Executor Service

This module provides AST-based validation to block dangerous code patterns
before execution in Docker containers.

Key Features:
- AST parsing for syntax validation
- Dangerous import detection (os, subprocess, socket, etc.)
- Dangerous builtin detection (eval, exec, open, etc.)
- Code length limits
- Clear error messages for debugging

Usage:
    validator = SafetyValidator()
    result = validator.validate(user_code)
    if result["safe"]:
        # Execute code
    else:
        # Return error: result["reason"]
"""

import ast
import logging
from typing import Dict, Any, List, Set

logger = logging.getLogger(__name__)


class SafetyValidator:
    """
    AST-based code validator for blocking dangerous operations.

    Validates Python code before execution to prevent:
    - File system access
    - Network operations
    - Process spawning
    - System modifications
    - Arbitrary code execution (eval, exec)
    """

    # Dangerous modules that should never be imported
    DANGEROUS_IMPORTS: Set[str] = {
        # File system
        "os", "sys", "shutil", "pathlib", "glob", "fnmatch",
        "tempfile", "io", "fileinput",

        # Process management
        "subprocess", "multiprocessing", "threading", "asyncio",

        # Network
        "socket", "urllib", "http", "ftplib", "telnetlib",
        "smtplib", "poplib", "imaplib", "nntplib",
        "ssl", "socketserver",

        # Code execution
        "importlib", "pkgutil", "runpy", "code", "codeop",

        # System
        "ctypes", "platform", "resource", "signal",

        # Serialization (can execute code)
        "pickle", "shelve", "marshal",
    }

    # Dangerous builtins that should never be called
    DANGEROUS_BUILTINS: Set[str] = {
        "eval", "exec", "compile", "__import__",
        "open", "input", "raw_input",
        "exit", "quit",
        "globals", "locals", "vars",
        "getattr", "setattr", "delattr",
        "hasattr",  # Can be used to probe for dangerous attributes
    }

    # Allowed imports (whitelist approach for safety)
    ALLOWED_IMPORTS: Set[str] = {
        # Data analysis
        "pandas", "numpy", "networkx",

        # Standard library (safe subset)
        "math", "statistics", "decimal", "fractions",
        "collections", "itertools", "functools",
        "datetime", "time", "calendar",
        "json", "csv", "re", "string",

        # Helper functions
        "code_helpers",
    }

    # Maximum code length (lines)
    MAX_CODE_LENGTH: int = 1000

    def __init__(self):
        """Initialize the safety validator."""
        self.violations: List[str] = []

    def validate(self, code: str) -> Dict[str, Any]:
        """
        Validate code for safety.

        Args:
            code: Python code string to validate

        Returns:
            Dictionary with structure:
            {
                "safe": bool,
                "reason": str (if unsafe),
                "violations": List[str] (all violations found)
            }
        """
        self.violations = []

        # Check 1: Empty code
        if not code or not code.strip():
            return {
                "safe": False,
                "reason": "Empty code provided",
                "violations": ["empty_code"]
            }

        # Check 2: Code length
        lines = code.split('\n')
        if len(lines) > self.MAX_CODE_LENGTH:
            return {
                "safe": False,
                "reason": f"Code exceeds maximum length of {self.MAX_CODE_LENGTH} lines (got {len(lines)} lines)",
                "violations": ["code_too_long"]
            }

        # Check 3: Parse AST (syntax validation)
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return {
                "safe": False,
                "reason": f"Syntax error at line {e.lineno}: {e.msg}",
                "violations": ["syntax_error"]
            }
        except Exception as e:
            return {
                "safe": False,
                "reason": f"Failed to parse code: {str(e)}",
                "violations": ["parse_error"]
            }

        # Check 4: Scan AST for dangerous patterns
        for node in ast.walk(tree):
            # Check imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if not self._is_import_safe(alias.name):
                        self.violations.append(f"dangerous_import: {alias.name}")

            elif isinstance(node, ast.ImportFrom):
                if node.module and not self._is_import_safe(node.module):
                    self.violations.append(f"dangerous_import: {node.module}")

            # Check function calls
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                    if func_name in self.DANGEROUS_BUILTINS:
                        self.violations.append(f"dangerous_builtin: {func_name}")

                # Check for __builtins__ access
                elif isinstance(node.func, ast.Attribute):
                    if isinstance(node.func.value, ast.Name):
                        if node.func.value.id == "__builtins__":
                            self.violations.append(f"builtin_access: __builtins__.{node.func.attr}")

            # Check attribute access (e.g., __builtins__, __dict__)
            elif isinstance(node, ast.Attribute):
                if node.attr.startswith('__') and node.attr.endswith('__'):
                    # Allow some safe dunder attributes
                    safe_dunders = {'__init__', '__str__', '__repr__', '__len__'}
                    if node.attr not in safe_dunders:
                        self.violations.append(f"dunder_access: {node.attr}")

        # Return validation result
        if self.violations:
            primary_violation = self.violations[0]
            return {
                "safe": False,
                "reason": self._format_violation_message(primary_violation),
                "violations": self.violations
            }

        return {
            "safe": True,
            "violations": []
        }

    def _is_import_safe(self, module_name: str) -> bool:
        """
        Check if a module import is safe.

        Uses whitelist approach: only explicitly allowed modules are safe.

        Args:
            module_name: Name of module to check

        Returns:
            True if safe, False if dangerous
        """
        # Check if module is explicitly dangerous
        if module_name in self.DANGEROUS_IMPORTS:
            return False

        # Check if module or its parent is in whitelist
        parts = module_name.split('.')
        for i in range(len(parts)):
            parent = '.'.join(parts[:i+1])
            if parent in self.ALLOWED_IMPORTS:
                return True

        # Not in whitelist = not safe
        logger.warning(f"Import not in whitelist: {module_name}")
        return False

    def _format_violation_message(self, violation: str) -> str:
        """
        Format a violation into a user-friendly error message.

        Args:
            violation: Violation string (e.g., "dangerous_import: os")

        Returns:
            Formatted error message
        """
        parts = violation.split(": ", 1)
        violation_type = parts[0]
        detail = parts[1] if len(parts) > 1 else ""

        messages = {
            "dangerous_import": f"Import '{detail}' is blocked for security. Allowed imports: {', '.join(sorted(self.ALLOWED_IMPORTS))}",
            "dangerous_builtin": f"Function '{detail}()' is blocked for security. This function can execute arbitrary code or access the file system.",
            "builtin_access": f"Access to '{detail}' is blocked. Direct access to Python internals is not allowed.",
            "dunder_access": f"Access to dunder attribute '{detail}' is blocked for security.",
            "empty_code": "No code provided to execute.",
            "code_too_long": f"Code exceeds maximum length of {self.MAX_CODE_LENGTH} lines.",
            "syntax_error": "Code contains syntax errors.",
            "parse_error": "Failed to parse code.",
        }

        return messages.get(violation_type, f"Code validation failed: {violation}")

    def get_allowed_imports(self) -> List[str]:
        """
        Get list of allowed imports for documentation.

        Returns:
            Sorted list of allowed module names
        """
        return sorted(self.ALLOWED_IMPORTS)

    def get_dangerous_imports(self) -> List[str]:
        """
        Get list of dangerous imports for documentation.

        Returns:
            Sorted list of dangerous module names
        """
        return sorted(self.DANGEROUS_IMPORTS)

    def get_dangerous_builtins(self) -> List[str]:
        """
        Get list of dangerous builtins for documentation.

        Returns:
            Sorted list of dangerous builtin names
        """
        return sorted(self.DANGEROUS_BUILTINS)


# Example usage and testing
if __name__ == "__main__":
    validator = SafetyValidator()

    # Test cases
    test_cases = [
        # Safe code
        ("from code_helpers import get_nodes\nnodes = get_nodes('abc')\nprint(len(nodes))", True),
        ("import pandas as pd\ndf = pd.DataFrame({'a': [1, 2, 3]})\nprint(df)", True),
        ("import networkx as nx\nG = nx.Graph()\nG.add_node('N001')\nprint(G.nodes())", True),

        # Dangerous code
        ("import os\nos.system('ls')", False),
        ("import subprocess\nsubprocess.call(['ls'])", False),
        ("eval('2 + 2')", False),
        ("exec('print(1)')", False),
        ("__import__('os').system('ls')", False),
        ("open('/etc/passwd', 'r')", False),

        # Edge cases
        ("", False),  # Empty
        ("import unknown_module", False),  # Not in whitelist
    ]

    print("Running safety validator tests...\n")
    passed = 0
    failed = 0

    for code, expected_safe in test_cases:
        result = validator.validate(code)
        status = "✅ PASS" if result["safe"] == expected_safe else "❌ FAIL"

        if result["safe"] == expected_safe:
            passed += 1
        else:
            failed += 1

        print(f"{status}: {code[:50]}...")
        if not result["safe"]:
            print(f"  Reason: {result['reason']}")
        print()

    print(f"\nResults: {passed} passed, {failed} failed")

    if failed == 0:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed")
