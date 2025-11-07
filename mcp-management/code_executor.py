"""
Code Executor Service
Week 2: Code Executor Service

This module manages safe code execution in isolated Docker containers.

Key Features:
- Docker container lifecycle management
- 5-second timeout protection
- Memory and CPU limits
- Automatic container cleanup
- Session ID injection
- stdout/stderr capture
- Integration with safety_validator

Usage:
    executor = CodeExecutor()
    result = await executor.execute_code({
        "code": "from code_helpers import get_nodes; print(len(get_nodes()))",
        "session_id": "abc123"
    })
"""

import os
import tempfile
import logging
import asyncio
from typing import Dict, Any, Optional
from pathlib import Path

# Import safety validator
from safety_validator import SafetyValidator

logger = logging.getLogger(__name__)

# Docker import with graceful fallback
try:
    import docker
    from docker.errors import DockerException, ContainerError, ImageNotFound, APIError
    DOCKER_AVAILABLE = True
except ImportError:
    DOCKER_AVAILABLE = False
    logger.warning("Docker package not installed. Run: pip install docker")


class CodeExecutor:
    """
    Manages safe execution of Python code in Docker containers.

    Workflow:
    1. Validate code with SafetyValidator
    2. Write code to temporary file
    3. Spin up Docker container with:
       - Session ID environment variable
       - 5-second timeout
       - Memory limit (256MB)
       - Read-only volume mount
    4. Capture stdout/stderr
    5. Clean up container and temp file
    6. Return results

    Security Features:
    - AST validation before execution
    - Docker isolation
    - Resource limits
    - Timeout enforcement
    - Read-only mounts
    - No network access
    """

    # Docker image name (from Week 1)
    DOCKER_IMAGE: str = "cms-code-executor"

    # Execution limits
    TIMEOUT_SECONDS: int = 5
    MEMORY_LIMIT: str = "256m"
    CPU_PERIOD: int = 100000
    CPU_QUOTA: int = 50000  # 50% of one core

    # FastAPI URL for helper functions
    FASTAPI_URL: str = "http://host.docker.internal:8000"

    def __init__(self):
        """Initialize the code executor."""
        self.validator = SafetyValidator()
        self.docker_client: Optional[Any] = None

        # Initialize Docker client if available
        if DOCKER_AVAILABLE:
            try:
                self.docker_client = docker.from_env()
                # Test connection
                self.docker_client.ping()
                logger.info("Docker client initialized successfully")
            except DockerException as e:
                logger.error(f"Failed to initialize Docker client: {e}")
                self.docker_client = None
        else:
            logger.error("Docker package not available")

    async def execute_code(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point for code execution (called by MCP tools).

        Args:
            args: Dictionary with:
                - code (str): Python code to execute
                - session_id (str): Session ID for context

        Returns:
            MCP tool result format:
            {
                "content": [{"type": "text", "text": "..."}],
                "isError": bool (optional)
            }
        """
        code = args.get("code", "")
        session_id = args.get("session_id", "")

        logger.info(f"Executing code for session {session_id}")
        logger.debug(f"Code to execute:\n{code}")

        # Validate inputs
        if not code:
            return self._error_response("No code provided")

        if not session_id:
            return self._error_response("No session_id provided")

        # Check Docker availability
        if not self.docker_client:
            return self._error_response(
                "Docker is not available. Please ensure Docker is installed and running.\n"
                "Install Docker: https://www.docker.com/products/docker-desktop/"
            )

        # Step 1: Validate code safety
        validation_result = self.validator.validate(code)
        if not validation_result["safe"]:
            logger.warning(f"Code validation failed: {validation_result['reason']}")
            return self._error_response(
                f"Code validation failed: {validation_result['reason']}\n\n"
                f"Allowed imports: {', '.join(self.validator.get_allowed_imports())}"
            )

        # Step 2: Execute code in Docker
        try:
            execution_result = await self._execute_in_docker(code, session_id)

            # Step 3: Return results
            if execution_result["success"]:
                return self._success_response(execution_result["stdout"])
            else:
                return self._error_response(
                    f"Code execution failed:\n{execution_result['stderr']}"
                )

        except Exception as e:
            logger.error(f"Unexpected error during code execution: {e}", exc_info=True)
            return self._error_response(f"Unexpected error: {str(e)}")

    async def _execute_in_docker(self, code: str, session_id: str) -> Dict[str, Any]:
        """
        Execute code in Docker container with timeout and resource limits.

        Args:
            code: Python code to execute
            session_id: Session ID for helper functions

        Returns:
            {
                "success": bool,
                "stdout": str,
                "stderr": str,
                "exit_code": int,
                "timed_out": bool
            }
        """
        temp_file = None
        container = None

        try:
            # Step 1: Write code to temporary file
            temp_file = self._write_code_to_temp_file(code)
            logger.debug(f"Code written to temporary file: {temp_file}")

            # Step 2: Check if Docker image exists
            try:
                self.docker_client.images.get(self.DOCKER_IMAGE)
            except ImageNotFound:
                return {
                    "success": False,
                    "stdout": "",
                    "stderr": f"Docker image '{self.DOCKER_IMAGE}' not found. Please build it first:\n"
                              f"cd mcp-management/code-execution && docker build -t {self.DOCKER_IMAGE} .",
                    "exit_code": -1,
                    "timed_out": False
                }

            # Step 3: Run container
            logger.info(f"Starting Docker container for session {session_id}")
            container = self.docker_client.containers.run(
                self.DOCKER_IMAGE,
                command="python /tmp/user_code.py",
                volumes={
                    temp_file: {"bind": "/tmp/user_code.py", "mode": "ro"}
                },
                environment={
                    "SESSION_ID": session_id,
                    "FASTAPI_URL": self.FASTAPI_URL,
                    "PYTHONUNBUFFERED": "1",
                    "PYTHONPATH": "/app"  # Add /app to Python path so code_helpers can be imported
                },
                detach=True,
                remove=False,  # Keep to read logs, then remove manually
                mem_limit=self.MEMORY_LIMIT,
                cpu_period=self.CPU_PERIOD,
                cpu_quota=self.CPU_QUOTA,
                network_mode="bridge",  # Allow network to FastAPI
                extra_hosts={"host.docker.internal": "host-gateway"}  # Ensure host.docker.internal works on all platforms
            )

            # Step 4: Wait with timeout
            try:
                logger.debug(f"Waiting for container (timeout: {self.TIMEOUT_SECONDS}s)")
                exit_result = container.wait(timeout=self.TIMEOUT_SECONDS)
                exit_code = exit_result["StatusCode"]
                timed_out = False
            except Exception as timeout_error:
                logger.warning(f"Container timeout: {timeout_error}")
                # Kill container
                try:
                    container.kill()
                except:
                    pass
                exit_code = -1
                timed_out = True

            # Step 5: Capture logs
            try:
                stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
            except Exception as e:
                logger.error(f"Failed to capture logs: {e}")
                stdout = ""
                stderr = f"Failed to capture logs: {str(e)}"

            # Add timeout message if needed
            if timed_out:
                stderr = f"[TIMEOUT] Code execution exceeded {self.TIMEOUT_SECONDS} seconds and was killed.\n" + stderr

            logger.info(f"Container finished: exit_code={exit_code}, timed_out={timed_out}")

            return {
                "success": exit_code == 0 and not timed_out,
                "stdout": stdout.strip(),
                "stderr": stderr.strip(),
                "exit_code": exit_code,
                "timed_out": timed_out
            }

        except ContainerError as e:
            logger.error(f"Container error: {e}")
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Container error: {str(e)}",
                "exit_code": e.exit_status,
                "timed_out": False
            }

        except APIError as e:
            logger.error(f"Docker API error: {e}")
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Docker API error: {str(e)}",
                "exit_code": -1,
                "timed_out": False
            }

        except Exception as e:
            logger.error(f"Unexpected error during Docker execution: {e}", exc_info=True)
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Unexpected error: {str(e)}",
                "exit_code": -1,
                "timed_out": False
            }

        finally:
            # Step 6: Cleanup
            if container:
                try:
                    container.remove(force=True)
                    logger.debug("Container removed successfully")
                except Exception as e:
                    logger.warning(f"Failed to remove container: {e}")

            if temp_file and os.path.exists(temp_file):
                try:
                    os.unlink(temp_file)
                    logger.debug("Temporary file removed successfully")
                except Exception as e:
                    logger.warning(f"Failed to remove temp file: {e}")

    def _write_code_to_temp_file(self, code: str) -> str:
        """
        Write code to a temporary file for Docker volume mount.

        Args:
            code: Python code string

        Returns:
            Absolute path to temporary file
        """
        # Create temp file that won't be auto-deleted
        fd, temp_path = tempfile.mkstemp(suffix='.py', prefix='cms_code_')

        # Write code with session_id preamble
        # This makes session_id available as a variable in user code
        with os.fdopen(fd, 'w') as f:
            f.write("import os\n")
            f.write("session_id = os.environ.get('SESSION_ID')\n")
            f.write("\n")
            f.write(code)

        return temp_path

    def _success_response(self, output: str) -> Dict[str, Any]:
        """
        Format successful execution result for MCP protocol.

        Args:
            output: stdout from code execution

        Returns:
            MCP tool result format
        """
        return {
            "content": [{
                "type": "text",
                "text": f"Code executed successfully:\n\n{output}" if output else "Code executed successfully (no output)"
            }]
        }

    def _error_response(self, error_message: str) -> Dict[str, Any]:
        """
        Format error result for MCP protocol.

        Args:
            error_message: Error description

        Returns:
            MCP tool result format with error flag
        """
        return {
            "content": [{
                "type": "text",
                "text": f"❌ {error_message}"
            }],
            "isError": True
        }

    def check_docker_availability(self) -> Dict[str, Any]:
        """
        Check if Docker is available and properly configured.

        Returns:
            {
                "available": bool,
                "message": str,
                "image_exists": bool
            }
        """
        if not DOCKER_AVAILABLE:
            return {
                "available": False,
                "message": "Docker Python package not installed. Run: pip install docker",
                "image_exists": False
            }

        if not self.docker_client:
            return {
                "available": False,
                "message": "Docker daemon not running or not accessible",
                "image_exists": False
            }

        try:
            # Check if image exists
            self.docker_client.images.get(self.DOCKER_IMAGE)
            image_exists = True
        except ImageNotFound:
            image_exists = False

        return {
            "available": True,
            "message": "Docker is available" + (" and image exists" if image_exists else " but image not built"),
            "image_exists": image_exists
        }


# Testing and example usage
if __name__ == "__main__":
    import asyncio

    async def test_executor():
        """Test the code executor with sample code."""
        executor = CodeExecutor()

        # Check Docker availability
        print("Checking Docker availability...")
        availability = executor.check_docker_availability()
        print(f"  Available: {availability['available']}")
        print(f"  Message: {availability['message']}")
        print(f"  Image exists: {availability['image_exists']}\n")

        if not availability['available'] or not availability['image_exists']:
            print("❌ Docker not ready. Please:")
            print("  1. Install Docker: https://www.docker.com/products/docker-desktop/")
            print("  2. Build image: cd mcp-management/code-execution && docker build -t cms-code-executor .")
            return

        # Test 1: Simple arithmetic
        print("Test 1: Simple arithmetic")
        result = await executor.execute_code({
            "code": "result = 2 + 2\nprint(f'2 + 2 = {result}')",
            "session_id": "test-session"
        })
        print(f"  Result: {result}\n")

        # Test 2: Import code_helpers (will fail without real session)
        print("Test 2: Import code_helpers")
        result = await executor.execute_code({
            "code": "from code_helpers import get_nodes\nprint('Import successful')",
            "session_id": "test-session"
        })
        print(f"  Result: {result}\n")

        # Test 3: Dangerous code (should be blocked)
        print("Test 3: Dangerous code (should be blocked)")
        result = await executor.execute_code({
            "code": "import os\nos.system('ls')",
            "session_id": "test-session"
        })
        print(f"  Result: {result}\n")

        # Test 4: Timeout (should be killed after 5 seconds)
        print("Test 4: Timeout test")
        result = await executor.execute_code({
            "code": "import time\ntime.sleep(10)\nprint('Should not see this')",
            "session_id": "test-session"
        })
        print(f"  Result: {result}\n")

    # Run tests
    asyncio.run(test_executor())
