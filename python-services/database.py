import os
import logging
from typing import List, Dict, Any, Optional
import asyncio
from contextlib import asynccontextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///cms_development.db")

        # For development - use SQLite by default
        if self.database_url.startswith("postgresql"):
            self.async_database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        else:
            self.database_url = "sqlite:///cms_development.db"
            self.async_database_url = "sqlite+aiosqlite:///cms_development.db"

        self.engine = None
        self.async_engine = None
        self.SessionLocal = None
        self._initialized = False
        self._schema_ensured = False

    async def initialize(self):
        if self._initialized:
            logger.debug("Database already initialized, skipping")
            return True

        try:
            self.async_engine = create_async_engine(
                self.async_database_url,
                echo=False,
                poolclass=StaticPool if "sqlite" in self.async_database_url else None,
            )

            self.SessionLocal = sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False
            )

            self._initialized = True
            logger.info("Database connection initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            return False

    async def ensure_schema(self):
        """Verify database schema exists, create if missing"""
        if self._schema_ensured:
            logger.debug("Database schema already ensured, skipping")
            return

        try:
            # Check if session_relationships exists (our canary table)
            query = "SELECT name FROM sqlite_master WHERE type='table' AND name='session_relationships'"
            result = await self.execute_query(query)

            if not result:
                # Schema missing - apply it
                await self._apply_schema()
                logger.info("Database schema applied successfully")
            else:
                logger.info("Database schema verified - all tables exist")

            self._schema_ensured = True

        except Exception as e:
            logger.error(f"Schema verification failed: {str(e)}")
            # Don't crash - just log the error

    async def _apply_schema(self):
        """Read and execute sqlite_schema.sql to create all tables"""
        try:
            import os

            # Get the schema file path
            current_dir = os.path.dirname(os.path.abspath(__file__))
            schema_path = os.path.join(current_dir, "..", "database", "sqlite_schema.sql")

            # Read the schema file
            with open(schema_path, 'r') as f:
                schema_sql = f.read()

            # Split into individual statements and execute
            statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]

            for statement in statements:
                if statement:
                    await self.execute_insert(statement)

            logger.info("Schema application completed")

        except FileNotFoundError:
            logger.error(f"Schema file not found at {schema_path}")
            raise
        except Exception as e:
            logger.error(f"Error applying schema: {str(e)}")
            raise

    async def close(self):
        """Properly close database connections"""
        try:
            if self.async_engine:
                await self.async_engine.dispose()
                logger.info("Database connections closed")
        except Exception as e:
            logger.error(f"Error closing database: {str(e)}")

    async def get_session(self):
        if not self.SessionLocal:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        return self.SessionLocal()

    @asynccontextmanager
    async def transaction_context(self):
        """Provides transaction context with automatic rollback on error"""
        async with await self.get_session() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Transaction failed, rolled back: {str(e)}")
                raise

    async def execute_query(self, query: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        try:
            async with await self.get_session() as session:
                result = await session.execute(text(query), params or {})
                rows = result.fetchall()
                return [dict(row._mapping) for row in rows]
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise

    async def execute_insert(self, query: str, params: Dict[str, Any] = None) -> int:
        try:
            async with await self.get_session() as session:
                result = await session.execute(text(query), params or {})
                await session.commit()
                return result.lastrowid if hasattr(result, 'lastrowid') else result.rowcount
        except Exception as e:
            logger.error(f"Error executing insert: {str(e)}")
            await session.rollback()
            raise

    # Chapter management
    async def create_chapter(self, title: str, description: str = None, pdf_filename: str = None, pdf_path: str = None) -> int:
        query = """
        INSERT INTO chapters (title, description, pdf_filename, pdf_path)
        VALUES (:title, :description, :pdf_filename, :pdf_path)
        RETURNING id
        """
        params = {
            "title": title,
            "description": description,
            "pdf_filename": pdf_filename,
            "pdf_path": pdf_path
        }
        result = await self.execute_insert(query, params)
        return result

    async def get_chapters(self) -> List[Dict[str, Any]]:
        query = "SELECT * FROM chapters ORDER BY upload_date DESC"
        return await self.execute_query(query)

    async def get_chapter_by_id(self, chapter_id: int) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM chapters WHERE id = :chapter_id"
        results = await self.execute_query(query, {"chapter_id": chapter_id})
        return results[0] if results else None

    # Node management
    async def create_node(self, node_id: str, chapter_id: int, title: str, raw_content: str,
                         page_number: int = None, position_data: Dict[str, Any] = None) -> int:
        query = """
        INSERT INTO nodes (node_id, chapter_id, title, raw_content, page_number, position_data)
        VALUES (:node_id, :chapter_id, :title, :raw_content, :page_number, :position_data)
        RETURNING id
        """
        params = {
            "node_id": node_id,
            "chapter_id": chapter_id,
            "title": title,
            "raw_content": raw_content,
            "page_number": page_number,
            "position_data": position_data
        }
        return await self.execute_insert(query, params)

    async def get_nodes_by_chapter(self, chapter_id: int) -> List[Dict[str, Any]]:
        query = """
        SELECT n.*,
               COUNT(ua.id) as assignment_count,
               COUNT(ts.id) as template_count
        FROM nodes n
        LEFT JOIN user_assignments ua ON n.id = ua.node_id
        LEFT JOIN template_selections ts ON n.id = ts.node_id
        WHERE n.chapter_id = :chapter_id
        GROUP BY n.id
        ORDER BY n.node_id
        """
        return await self.execute_query(query, {"chapter_id": chapter_id})

    async def get_node_by_id(self, node_id: int) -> Optional[Dict[str, Any]]:
        query = "SELECT * FROM nodes WHERE id = :node_id"
        results = await self.execute_query(query, {"node_id": node_id})
        return results[0] if results else None

    # Content category management
    async def get_content_categories(self) -> List[Dict[str, Any]]:
        query = "SELECT * FROM content_categories ORDER BY name"
        return await self.execute_query(query)

    # User assignments management
    async def create_user_assignment(self, node_id: int, category_id: int, content_text: str,
                                   confidence_score: float = 0.0, is_ai_suggested: bool = False,
                                   assigned_by: str = None) -> int:
        query = """
        INSERT INTO user_assignments (node_id, category_id, content_text, confidence_score,
                                    is_ai_suggested, assigned_by)
        VALUES (:node_id, :category_id, :content_text, :confidence_score,
                :is_ai_suggested, :assigned_by)
        RETURNING id
        """
        params = {
            "node_id": node_id,
            "category_id": category_id,
            "content_text": content_text,
            "confidence_score": confidence_score,
            "is_ai_suggested": is_ai_suggested,
            "assigned_by": assigned_by
        }
        return await self.execute_insert(query, params)

    async def get_assignments_by_node(self, node_id: int) -> List[Dict[str, Any]]:
        query = """
        SELECT ua.*, cc.name as category_name, cc.description as category_description
        FROM user_assignments ua
        JOIN content_categories cc ON ua.category_id = cc.id
        WHERE ua.node_id = :node_id
        ORDER BY ua.assigned_at DESC
        """
        return await self.execute_query(query, {"node_id": node_id})

    # Template management
    async def get_templates(self) -> List[Dict[str, Any]]:
        query = "SELECT * FROM templates ORDER BY name"
        return await self.execute_query(query)

    # AI suggestions management
    async def create_ai_suggestion(self, node_id: int, suggestion_type: str, suggested_value: str,
                                 confidence_score: float, reasoning: str = None) -> int:
        query = """
        INSERT INTO ai_suggestions (node_id, suggestion_type, suggested_value,
                                  confidence_score, reasoning)
        VALUES (:node_id, :suggestion_type, :suggested_value, :confidence_score, :reasoning)
        RETURNING id
        """
        params = {
            "node_id": node_id,
            "suggestion_type": suggestion_type,
            "suggested_value": suggested_value,
            "confidence_score": confidence_score,
            "reasoning": reasoning
        }
        return await self.execute_insert(query, params)

    async def update_suggestion_feedback(self, suggestion_id: int, feedback: str) -> bool:
        query = """
        UPDATE ai_suggestions
        SET user_feedback = :feedback, feedback_at = CURRENT_TIMESTAMP
        WHERE id = :suggestion_id
        """
        try:
            await self.execute_insert(query, {"suggestion_id": suggestion_id, "feedback": feedback})
            return True
        except Exception as e:
            logger.error(f"Error updating suggestion feedback: {str(e)}")
            return False

    # Analytics
    async def log_user_action(self, node_id: int, user_action: str, action_data: Dict[str, Any] = None,
                            user_id: str = None, session_id: str = None) -> int:
        query = """
        INSERT INTO learning_analytics (node_id, user_action, action_data, user_id, session_id)
        VALUES (:node_id, :user_action, :action_data, :user_id, :session_id)
        RETURNING id
        """
        params = {
            "node_id": node_id,
            "user_action": user_action,
            "action_data": action_data,
            "user_id": user_id,
            "session_id": session_id
        }
        return await self.execute_insert(query, params)

    # Node Components management - Method stubs for component sequences
    async def get_node_components(self, node_id: str) -> List[Dict[str, Any]]:
        """Retrieve component sequence for a node from database"""
        try:
            query = """
            SELECT nc.component_type, nc.component_order, nc.parameters, nc.confidence_score,
                   nc.created_at, nc.last_modified, nc.version
            FROM node_components nc
            JOIN nodes n ON nc.node_id = n.id
            WHERE n.node_id = :node_id
            ORDER BY nc.component_order
            """
            results = await self.execute_query(query, {"node_id": node_id})
            
            # Deserialize JSON parameters back to dict
            import json
            for result in results:
                if result.get("parameters") and isinstance(result["parameters"], str):
                    try:
                        result["parameters"] = json.loads(result["parameters"])
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to decode parameters for component: {result}")
                        result["parameters"] = {}
            
            return results
        except Exception as e:
            logger.error(f"Error retrieving components for node {node_id}: {str(e)}")
            return []

    async def save_node_components(self, node_id: str, components: List[Dict[str, Any]],
                                 suggested_template: str, overall_confidence: float) -> bool:
        """Save complete component sequence to database"""
        try:
            # Get internal node ID from node_id string
            node_query = "SELECT id FROM nodes WHERE node_id = :node_id"
            node_result = await self.execute_query(node_query, {"node_id": node_id})
            if not node_result:
                logger.error(f"Node {node_id} not found in database")
                return False

            internal_node_id = node_result[0]["id"]

            # Delete existing components for this node
            delete_query = "DELETE FROM node_components WHERE node_id = :node_id"
            await self.execute_insert(delete_query, {"node_id": internal_node_id})

            # Insert new components
            for component in components:
                insert_query = """
                INSERT INTO node_components (node_id, component_type, component_order,
                                           parameters, confidence_score)
                VALUES (:node_id, :component_type, :component_order, :parameters, :confidence_score)
                """
                import json
                params = {
                    "node_id": internal_node_id,
                    "component_type": component["type"],
                    "component_order": component["order"],
                    "parameters": json.dumps(component["parameters"]),  # Serialize dict to JSON string
                    "confidence_score": component.get("confidence", 0.5)
                }
                await self.execute_insert(insert_query, params)

            return True
        except Exception as e:
            logger.error(f"Error saving components for node {node_id}: {str(e)}")
            return False

    async def update_node_component(self, node_id: str, order: int, component: Dict[str, Any]) -> bool:
        """Update specific component in sequence"""
        try:
            # Get internal node ID from node_id string
            node_query = "SELECT id FROM nodes WHERE node_id = :node_id"
            node_result = await self.execute_query(node_query, {"node_id": node_id})
            if not node_result:
                logger.error(f"Node {node_id} not found in database")
                return False

            internal_node_id = node_result[0]["id"]

            # Update the specific component
            update_query = """
            UPDATE node_components
            SET component_type = :component_type,
                parameters = :parameters,
                confidence_score = :confidence_score,
                last_modified = CURRENT_TIMESTAMP
            WHERE node_id = :node_id AND component_order = :component_order
            """
            params = {
                "node_id": internal_node_id,
                "component_order": order,
                "component_type": component["type"],
                "parameters": component["parameters"],
                "confidence_score": component.get("confidence", 0.5)
            }

            result = await self.execute_insert(update_query, params)
            return result > 0  # Returns True if at least one row was updated

        except Exception as e:
            logger.error(f"Error updating component for node {node_id}, order {order}: {str(e)}")
            return False

    async def delete_node_component(self, node_id: str, order: int) -> bool:
        """Delete component and reorder remaining components"""
        try:
            # Get internal node ID from node_id string
            node_query = "SELECT id FROM nodes WHERE node_id = :node_id"
            node_result = await self.execute_query(node_query, {"node_id": node_id})
            if not node_result:
                logger.error(f"Node {node_id} not found in database")
                return False

            internal_node_id = node_result[0]["id"]

            # Use transaction for atomic delete + reorder
            async with await self.get_session() as session:
                # Delete the specific component
                delete_query = """
                DELETE FROM node_components
                WHERE node_id = :node_id AND component_order = :component_order
                """
                delete_result = await session.execute(
                    text(delete_query),
                    {"node_id": internal_node_id, "component_order": order}
                )

                # If no component was deleted, return False
                if delete_result.rowcount == 0:
                    return False

                # Reorder remaining components (decrement order for components after deleted one)
                reorder_query = """
                UPDATE node_components
                SET component_order = component_order - 1
                WHERE node_id = :node_id AND component_order > :deleted_order
                """
                await session.execute(
                    text(reorder_query),
                    {"node_id": internal_node_id, "deleted_order": order}
                )

                await session.commit()
                return True

        except Exception as e:
            logger.error(f"Error deleting component for node {node_id}, order {order}: {str(e)}")
            return False

    async def reorder_node_components(self, node_id: str, new_order: List[int]) -> bool:
        """Reorder components based on new order array"""
        try:
            # Get current components for this node
            current_components = await self.get_node_components(node_id)
            if not current_components:
                return False

            # Validate new_order array length matches current components
            if len(new_order) != len(current_components):
                return False

            # Reorder the components data based on new_order
            reordered_components = []
            for new_pos, old_order in enumerate(new_order):
                # Find component with the old order
                for comp in current_components:
                    if comp["component_order"] == old_order:
                        comp_dict = {
                            "type": comp["component_type"],
                            "order": new_pos + 1,  # New order position (1-based)
                            "parameters": comp["parameters"],
                            "confidence": comp["confidence_score"]
                        }
                        reordered_components.append(comp_dict)
                        break

            # Use existing save method to replace all components
            success = await self.save_node_components(
                node_id, reordered_components, "text-heavy", 0.8  # TODO: Store actual template/confidence
            )
            return success

        except Exception as e:
            logger.error(f"Error reordering components for node {node_id}: {str(e)}")
            return False

    async def save_node_with_content_transactional(self, session_id: str, node_data: Dict[str, Any], 
                                                 content_data: Dict[str, Any], template_id: str = None) -> bool:
        """Saves node + content + template in single transaction"""
        try:
            async with self.transaction_context() as session:
                # Create node
                node_query = """
                INSERT INTO nodes (node_id, chapter_id, title, raw_content, session_id)
                VALUES (:node_id, :chapter_id, :title, :raw_content, :session_id)
                RETURNING id
                """
                node_result = await session.execute(text(node_query), {
                    "node_id": node_data["node_id"],
                    "chapter_id": node_data.get("chapter_id", 1),
                    "title": node_data["title"],
                    "raw_content": node_data.get("raw_content", ""),
                    "session_id": session_id
                })
                internal_node_id = node_result.scalar()
                
                # Save content to user_assignments
                for category, content in content_data.items():
                    if content.strip():
                        content_query = """
                        INSERT INTO user_assignments (node_id, category_id, content_text, assigned_by)
                        VALUES (:node_id, :category_id, :content_text, :assigned_by)
                        """
                        category_map = {"explanation": 1, "real_world_example": 2, "textbook_content": 3, "memory_trick": 4}
                        await session.execute(text(content_query), {
                            "node_id": internal_node_id,
                            "category_id": category_map.get(category, 1),
                            "content_text": content,
                            "assigned_by": "system"
                        })
                
                # Save template if provided
                if template_id:
                    template_query = """
                    INSERT INTO template_selections (node_id, template_name, selected_by)
                    VALUES (:node_id, :template_name, :selected_by)
                    """
                    await session.execute(text(template_query), {
                        "node_id": internal_node_id,
                        "template_name": template_id,
                        "selected_by": "system"
                    })
                
                return True
        except Exception as e:
            logger.error(f"Error saving node with content: {str(e)}")
            return False

    async def execute_in_transaction(self, operations: List[Dict[str, Any]]) -> bool:
        """Executes multiple database operations in single transaction"""
        try:
            async with self.transaction_context() as session:
                for operation in operations:
                    await session.execute(text(operation["query"]), operation.get("params", {}))
                return True
        except Exception as e:
            logger.error(f"Transaction execution failed: {str(e)}")
            return False

    # Session Management Methods
    async def create_session(self, user_id: str = "anonymous") -> str:
        """Creates new session with permanent expiry and default starter nodes (atomic)"""
        try:
            import uuid
            session_id = str(uuid.uuid4())

            # Use transaction to ensure session + default nodes are created atomically
            async with self.transaction_context() as session:
                # Create session
                session_query = """
                INSERT INTO sessions (id, user_id, expires_at)
                VALUES (:session_id, :user_id, datetime('now', '+100 years'))
                """
                await session.execute(text(session_query), {"session_id": session_id, "user_id": user_id})

                # Auto-create default starter nodes for new session
                default_nodes = [
                    {
                        "node_id": "N001",
                        "title": "N001",
                        "raw_content": "",
                        "chapter_id": 1
                    },
                    {
                        "node_id": "N002",
                        "title": "Adding Fractions",
                        "raw_content": "",
                        "chapter_id": 1
                    }
                ]

                for node_data in default_nodes:
                    node_query = """
                    INSERT INTO nodes (node_id, session_id, title, raw_content, chapter_id)
                    VALUES (:node_id, :session_id, :title, :raw_content, :chapter_id)
                    """
                    await session.execute(text(node_query), {
                        "node_id": node_data["node_id"],
                        "session_id": session_id,
                        "title": node_data.get("title", node_data["node_id"]),
                        "raw_content": node_data.get("raw_content", ""),
                        "chapter_id": node_data.get("chapter_id", 1)
                    })

            logger.info(f"Created new session {session_id} with default starter nodes")
            return session_id
        except Exception as e:
            logger.error(f"Error creating session: {str(e)}")
            return None

    async def validate_session(self, session_id: str) -> bool:
        """Checks if session exists and updates access timestamp atomically"""
        try:
            # Use transaction to ensure validation + access update are atomic
            async with self.transaction_context() as session:
                # Check if session exists
                query = """
                SELECT id FROM sessions
                WHERE id = :session_id
                """
                result = await session.execute(text(query), {"session_id": session_id})
                session_exists = result.fetchone()

                if session_exists:
                    # Update last_accessed in same transaction
                    update_query = """
                    UPDATE sessions
                    SET last_accessed = datetime('now')
                    WHERE id = :session_id
                    """
                    await session.execute(text(update_query), {"session_id": session_id})
                    return True

            return False
        except Exception as e:
            logger.error(f"Error validating session: {str(e)}")
            return False

    async def cleanup_expired_sessions(self) -> int:
        """Cleanup disabled to prevent accidental deletion of permanent sessions"""
        try:
            query = """
            DELETE FROM sessions 
            WHERE 1=0
            """
            result = await self.execute_insert(query)
            logger.info(f"Cleaned up {result} expired sessions")
            return result
        except Exception as e:
            logger.error(f"Error cleaning up sessions: {str(e)}")
            return 0

    async def update_session_access(self, session_id: str) -> bool:
        """Updates last_accessed timestamp"""
        try:
            query = """
            UPDATE sessions 
            SET last_accessed = datetime('now')
            WHERE id = :session_id
            """
            await self.execute_insert(query, {"session_id": session_id})
            return True
        except Exception as e:
            logger.error(f"Error updating session access: {str(e)}")
            return False

    # Session-Aware Node Operations
    async def get_session_nodes(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all nodes for a specific session"""
        try:
            query = """
            SELECT n.*, 
                   ts.template_name as assigned_template,
                   COUNT(ua.id) as content_count
            FROM nodes n
            LEFT JOIN template_selections ts ON n.id = ts.node_id
            LEFT JOIN user_assignments ua ON n.id = ua.node_id
            WHERE n.session_id = :session_id
            GROUP BY n.id
            ORDER BY n.node_id
            """
            return await self.execute_query(query, {"session_id": session_id})
        except Exception as e:
            logger.error(f"Error getting session nodes: {str(e)}")
            return []

    async def save_session_node_content(self, session_id: str, node_id: str, content_data: Dict[str, str]) -> bool:
        """Save node content for a session with transaction safety"""
        try:
            # First check if node exists in this session
            node_query = "SELECT id FROM nodes WHERE session_id = :session_id AND node_id = :node_id"
            node_result = await self.execute_query(node_query, {"session_id": session_id, "node_id": node_id})
            
            if not node_result:
                # Create node if it doesn't exist
                await self.create_session_node(session_id, {
                    "node_id": node_id,
                    "title": f"Node {node_id}",
                    "raw_content": ""
                })
                node_result = await self.execute_query(node_query, {"session_id": session_id, "node_id": node_id})
            
            internal_node_id = node_result[0]["id"]
            
            # Use transaction to save all content
            async with self.transaction_context() as session:
                # Delete existing content for this node
                delete_query = "DELETE FROM user_assignments WHERE node_id = :node_id"
                await session.execute(text(delete_query), {"node_id": internal_node_id})
                
                # Save new content
                category_map = {"explanation": 1, "real_world_example": 2, "textbook_content": 3, "memory_trick": 4}
                for category, content in content_data.items():
                    if content and content.strip():
                        content_query = """
                        INSERT INTO user_assignments (node_id, category_id, content_text, assigned_by)
                        VALUES (:node_id, :category_id, :content_text, :assigned_by)
                        """
                        await session.execute(text(content_query), {
                            "node_id": internal_node_id,
                            "category_id": category_map.get(category, 1),
                            "content_text": content.strip(),
                            "assigned_by": "user"
                        })
            
            return True
        except Exception as e:
            logger.error(f"Error saving session node content: {str(e)}")
            return False

    async def create_session_node(self, session_id: str, node_data: Dict[str, Any]) -> bool:
        """Create a new node in a session"""
        try:
            query = """
            INSERT INTO nodes (node_id, session_id, title, raw_content, chapter_id)
            VALUES (:node_id, :session_id, :title, :raw_content, :chapter_id)
            """
            await self.execute_insert(query, {
                "node_id": node_data["node_id"],
                "session_id": session_id,
                "title": node_data.get("title", node_data["node_id"]),
                "raw_content": node_data.get("raw_content", ""),
                "chapter_id": node_data.get("chapter_id", 1)
            })
            return True
        except Exception as e:
            logger.error(f"Error creating session node: {str(e)}")
            return False

    async def create_session_relationship(self, session_id: str, relationship_data: Dict[str, Any]) -> bool:
        """Create a new relationship in a session"""
        try:
            query = """
            INSERT INTO session_relationships (session_id, from_node_id, to_node_id, relationship_type, explanation, created_by, confidence_score)
            VALUES (:session_id, :from_node_id, :to_node_id, :relationship_type, :explanation, :created_by, :confidence_score)
            """
            await self.execute_insert(query, {
                "session_id": session_id,
                "from_node_id": relationship_data["from"],
                "to_node_id": relationship_data["to"],
                "relationship_type": relationship_data.get("type", "LEADS_TO"),
                "explanation": relationship_data.get("explanation", ""),
                "created_by": relationship_data.get("created_by", "CSV_IMPORT"),
                "confidence_score": relationship_data.get("confidence_score", 1.0)
            })
            return True
        except Exception as e:
            logger.error(f"Error creating session relationship: {str(e)}")
            return False

    async def get_session_relationships(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all relationships for a specific session"""
        try:
            query = """
            SELECT from_node_id, to_node_id, relationship_type, explanation, created_by, confidence_score, created_at
            FROM session_relationships
            WHERE session_id = :session_id
            ORDER BY created_at
            """
            return await self.execute_query(query, {"session_id": session_id})
        except Exception as e:
            logger.error(f"Error getting session relationships: {str(e)}")
            return []

    async def bulk_create_relationships(self, session_id: str, relationships: List[Dict[str, Any]]) -> bool:
        """Create multiple relationships in a session efficiently (atomic)"""
        try:
            if not relationships:
                return True

            # Use transaction to ensure all relationships are created atomically
            async with self.transaction_context() as session:
                query = """
                INSERT INTO session_relationships (session_id, from_node_id, to_node_id, relationship_type, explanation, created_by, confidence_score)
                VALUES (:session_id, :from_node_id, :to_node_id, :relationship_type, :explanation, :created_by, :confidence_score)
                """

                for rel in relationships:
                    data = {
                        "session_id": session_id,
                        "from_node_id": rel["from"],
                        "to_node_id": rel["to"],
                        "relationship_type": rel.get("type", "LEADS_TO"),
                        "explanation": rel.get("explanation", ""),
                        "created_by": rel.get("created_by", "CSV_IMPORT"),
                        "confidence_score": rel.get("confidence_score", 1.0)
                    }
                    await session.execute(text(query), data)

            logger.info(f"Bulk created {len(relationships)} relationships for session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error bulk creating relationships: {str(e)}")
            return False

    async def create_session_relationship(self, session_id: str, relationship_data: Dict[str, Any]) -> bool:
        """Create a single relationship in a session"""
        try:
            query = """
            INSERT INTO session_relationships (session_id, from_node_id, to_node_id, relationship_type, explanation, created_by, confidence_score)
            VALUES (:session_id, :from_node_id, :to_node_id, :relationship_type, :explanation, :created_by, :confidence_score)
            """

            data = {
                "session_id": session_id,
                "from_node_id": relationship_data["from"],
                "to_node_id": relationship_data["to"],
                "relationship_type": relationship_data.get("type", "LEADS_TO"),
                "explanation": relationship_data.get("explanation", ""),
                "created_by": relationship_data.get("created_by", "USER"),
                "confidence_score": relationship_data.get("confidence_score", 1.0)
            }

            await self.execute_insert(query, data)
            logger.info(f"Created relationship {relationship_data['from']} -> {relationship_data['to']} for session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error creating relationship: {str(e)}")
            return False

    async def delete_session_relationship(self, session_id: str, relationship_id: int) -> bool:
        """Delete a specific relationship in a session"""
        try:
            query = """
            DELETE FROM session_relationships
            WHERE id = :relationship_id AND session_id = :session_id
            """

            result = await self.execute_insert(query, {"relationship_id": relationship_id, "session_id": session_id})
            if result:
                logger.info(f"Deleted relationship {relationship_id} for session {session_id}")
                return True
            else:
                logger.warning(f"Relationship {relationship_id} not found for session {session_id}")
                return False
        except Exception as e:
            logger.error(f"Error deleting relationship: {str(e)}")
            return False

    async def update_session_relationship(self, session_id: str, relationship_id: int, update_data: Dict[str, Any]) -> bool:
        """Update a specific relationship in a session"""
        try:
            # Build dynamic update query based on provided fields
            set_clauses = []
            params = {"relationship_id": relationship_id, "session_id": session_id}

            for key, value in update_data.items():
                set_clauses.append(f"{key} = :{key}")
                params[key] = value

            if not set_clauses:
                return False

            query = f"""
            UPDATE session_relationships
            SET {', '.join(set_clauses)}
            WHERE id = :relationship_id AND session_id = :session_id
            """

            result = await self.execute_insert(query, params)
            if result:
                logger.info(f"Updated relationship {relationship_id} for session {session_id}: {list(update_data.keys())}")
                return True
            else:
                logger.warning(f"Relationship {relationship_id} not found for session {session_id}")
                return False
        except Exception as e:
            logger.error(f"Error updating relationship: {str(e)}")
            return False

    async def get_session_node_content(self, session_id: str, node_id: str) -> Dict[str, str]:
        """Get content for a specific node in a session"""
        try:
            query = """
            SELECT ua.content_text, cc.name as category_name
            FROM user_assignments ua
            JOIN content_categories cc ON ua.category_id = cc.id
            JOIN nodes n ON ua.node_id = n.id
            WHERE n.session_id = :session_id AND n.node_id = :node_id
            """
            result = await self.execute_query(query, {"session_id": session_id, "node_id": node_id})
            
            # Convert to expected format
            content = {"explanation": "", "real_world_example": "", "textbook_content": "", "memory_trick": ""}
            for row in result:
                category_key = row["category_name"].lower().replace(" ", "_")
                content[category_key] = row["content_text"]
            
            return content
        except Exception as e:
            logger.error(f"Error getting session node content: {str(e)}")
            return {"explanation": "", "real_world_example": "", "textbook_content": "", "memory_trick": ""}

    # Position Management Methods
    async def save_session_positions(self, session_id: str, positions_dict: Dict[str, Dict[str, float]]) -> bool:
        """Save node positions for a session"""
        try:
            import json
            async with self.transaction_context() as session:
                for node_id, position in positions_dict.items():
                    # Update position_data for each node in this session
                    update_query = """
                    UPDATE nodes
                    SET position_data = :position_data, last_modified = datetime('now')
                    WHERE session_id = :session_id AND node_id = :node_id
                    """
                    await session.execute(text(update_query), {
                        "session_id": session_id,
                        "node_id": node_id,
                        "position_data": json.dumps(position)
                    })
            return True
        except Exception as e:
            logger.error(f"Error saving session positions: {str(e)}")
            return False

    async def load_session_positions(self, session_id: str) -> Dict[str, Dict[str, float]]:
        """Load node positions for a session"""
        try:
            query = """
            SELECT node_id, position_data
            FROM nodes
            WHERE session_id = :session_id AND position_data IS NOT NULL
            """
            result = await self.execute_query(query, {"session_id": session_id})

            positions = {}
            import json
            for row in result:
                if row["position_data"]:
                    try:
                        positions[row["node_id"]] = json.loads(row["position_data"])
                    except (json.JSONDecodeError, TypeError):
                        logger.warning(f"Invalid position data for node {row['node_id']}")

            return positions
        except Exception as e:
            logger.error(f"Error loading session positions: {str(e)}")
            return {}

    async def close(self):
        if self.async_engine:
            await self.async_engine.dispose()
            logger.info("Database connection closed")