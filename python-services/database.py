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

    async def initialize(self):
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

            logger.info("Database connection initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            return False

    async def get_session(self):
        if not self.SessionLocal:
            await self.initialize()
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
        """Creates new session with 36-hour expiry"""
        try:
            import uuid
            session_id = str(uuid.uuid4())
            
            query = """
            INSERT INTO sessions (id, user_id, expires_at)
            VALUES (:session_id, :user_id, datetime('now', '+36 hours'))
            """
            await self.execute_insert(query, {"session_id": session_id, "user_id": user_id})
            return session_id
        except Exception as e:
            logger.error(f"Error creating session: {str(e)}")
            return None

    async def validate_session(self, session_id: str) -> bool:
        """Checks if session exists and hasn't expired"""
        try:
            query = """
            SELECT id FROM sessions 
            WHERE id = :session_id AND expires_at > datetime('now')
            """
            result = await self.execute_query(query, {"session_id": session_id})
            if result:
                # Update last_accessed
                await self.update_session_access(session_id)
                return True
            return False
        except Exception as e:
            logger.error(f"Error validating session: {str(e)}")
            return False

    async def cleanup_expired_sessions(self) -> int:
        """Deletes expired sessions and their associated data"""
        try:
            query = """
            DELETE FROM sessions 
            WHERE expires_at < datetime('now')
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

    async def close(self):
        if self.async_engine:
            await self.async_engine.dispose()
            logger.info("Database connection closed")