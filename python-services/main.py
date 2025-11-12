import sys
import os

# Add parent directory to path for questions module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import logging
import json
import asyncio
from dotenv import load_dotenv
from anthropic import Anthropic
try:
    from pdf_extractor import PDFProcessor
    PDF_PROCESSOR_AVAILABLE = True
except ImportError:
    PDF_PROCESSOR_AVAILABLE = False
    print("Warning: PDF processor not available due to missing dependencies")

try:
    from database import DatabaseManager
    DATABASE_AVAILABLE = True
except ImportError:
    DATABASE_AVAILABLE = False
    print("Warning: Database manager not available due to missing dependencies")

try:
    from template_renderer import TemplateRenderer
    TEMPLATE_RENDERER_AVAILABLE = True
except ImportError:
    TEMPLATE_RENDERER_AVAILABLE = False
    print("Warning: Template renderer not available due to missing dependencies")

try:
    from vision_processor import VisionProcessor
    VISION_PROCESSOR_AVAILABLE = True
except ImportError:
    VISION_PROCESSOR_AVAILABLE = False
    print("Warning: Vision processor not available due to missing dependencies")

try:
    from questions.backend.api import router as question_router, set_db_manager
    QUESTIONS_AVAILABLE = True
except ImportError:
    QUESTIONS_AVAILABLE = False
    print("Warning: Questions module not available due to missing dependencies")

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Claude API
CLAUDE_API_KEY = os.getenv('ANTHROPIC_API_KEY')
if CLAUDE_API_KEY:
    claude_client = Anthropic(api_key=CLAUDE_API_KEY)
    CLAUDE_AVAILABLE = True
else:
    claude_client = None
    CLAUDE_AVAILABLE = False
    print("Warning: ANTHROPIC_API_KEY not found. Claude features will be disabled.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown"""
    # Startup sequence
    logger.info("Starting application...")

    if db_manager:
        try:
            await db_manager.initialize()
            await db_manager.ensure_schema()
            logger.info("Database initialization completed successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            # App still starts - just log the error
    else:
        logger.warning("Database manager not available")

    logger.info("Application startup complete")

    yield  # Application runs

    # Shutdown sequence
    logger.info("Shutting down application...")

    if db_manager:
        try:
            await db_manager.close()
            logger.info("Database connections closed")
        except Exception as e:
            logger.error(f"Error during database shutdown: {str(e)}")

    logger.info("Application shutdown complete")

app = FastAPI(
    title="Educational CMS PDF Processor",
    description="AI-powered PDF content extraction and classification service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for image serving
app.mount("/uploads", StaticFiles(directory="../uploads"), name="uploads")

# Mount the main CMS directory as static files
app.mount("/cms", StaticFiles(directory="../frontend/public"), name="cms")
app.mount("/templates", StaticFiles(directory="../templates"), name="templates")

# Mount React Question Builder bundle
app.mount("/questions/frontend/build", StaticFiles(directory="../questions/frontend/build"), name="question-builder")

pdf_processor = PDFProcessor() if PDF_PROCESSOR_AVAILABLE else None
db_manager = DatabaseManager() if DATABASE_AVAILABLE else None
template_renderer = TemplateRenderer() if TEMPLATE_RENDERER_AVAILABLE else None

# Try to initialize vision processor, but don't crash if it fails
vision_processor = None
if VISION_PROCESSOR_AVAILABLE:
    try:
        vision_processor = VisionProcessor()
    except Exception as e:
        print(f"Warning: Vision processor initialization failed: {e}")
        print("Server will continue without vision processing capabilities")

# Include question router
if QUESTIONS_AVAILABLE and db_manager:
    set_db_manager(db_manager)
    app.include_router(question_router)
    logger.info("Question system router included")

# In-memory storage for nodes
nodes_storage = []
node_content: Dict[str, 'ContentCreate'] = {}
# Note: node_component_sequences removed - all component operations now use database

# Pydantic models for request bodies
class NodeCreate(BaseModel):
    node_id: str
    title: str
    chapter_id: str

class NodeResponse(BaseModel):
    node_id: str
    title: str
    chapter_id: str
    created_at: Optional[str] = None

class ContentCreate(BaseModel):
    explanation: str = ""
    real_world_example: str = ""
    textbook_content: str = ""
    memory_trick: str = ""

class ContentResponse(ContentCreate):
    node_id: str

# Position Models
class PositionData(BaseModel):
    x: float
    y: float

class PositionsUpdate(BaseModel):
    positions: Dict[str, PositionData]

# Relationship Models
class RelationshipCreate(BaseModel):
    from_node_id: str
    to_node_id: str
    relationship_type: str = "LEADS_TO"
    explanation: str = ""
    created_by: str = "USER"
    confidence_score: float = 1.0

class RelationshipUpdate(BaseModel):
    relationship_type: Optional[str] = None
    explanation: Optional[str] = None
    confidence_score: Optional[float] = None

class RelationshipResponse(BaseModel):
    id: int
    from_node_id: str
    to_node_id: str
    relationship_type: str
    explanation: str
    created_by: str
    confidence_score: float
    created_at: str

# Component Sequence Models
class ComponentItem(BaseModel):
    type: str
    order: int
    parameters: Dict[str, Any]
    confidence: Optional[float] = 0.5

class ComponentSequence(BaseModel):
    node_id: str
    components: List[ComponentItem]
    suggested_template: str
    overall_confidence: float
    created_at: Optional[str] = None

class ComponentSequenceResponse(BaseModel):
    node_id: str
    components: List[ComponentItem]
    suggested_template: str
    overall_confidence: float
    total_components: int
    created_at: Optional[str] = None

class HighlightBoxRequest(BaseModel):
    content: str
    title: str = ""
    image_url: Optional[str] = None

class HighlightBoxUpdateRequest(BaseModel):
    content: str
    title: str = ""
    image_url: Optional[str] = None

class TemplateRenderRequest(BaseModel):
    template_name: str
    content: str
    title: str = ""
    variables: Optional[dict] = None

class GenerateSVGsRequest(BaseModel):
    context: str
    titles: List[str]
    descriptions: List[str]

# Serve main CMS at root
@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main CMS interface"""
    try:
        main_cms_path = "../frontend/public/index.html"
        if os.path.exists(main_cms_path):
            with open(main_cms_path, 'r') as f:
                return HTMLResponse(content=f.read())
        else:
            return HTMLResponse(content="""
            <h1>CMS Files</h1>
            <p>Main CMS not found. Available options:</p>
            <ul>
                <li><a href="/cms/index.html">Main CMS Interface</a></li>
                <li><a href="/frontend/index.html">API Management Interface</a></li>
                <li><a href="/health">API Health Check</a></li>
            </ul>
            """)
    except Exception as e:
        logger.error(f"Error serving main CMS: {str(e)}")
        return HTMLResponse(content=f"<h1>Error loading CMS</h1><p>{str(e)}</p>")

@app.get("/api")
async def api_info():
    return {"message": "Educational CMS PDF Processor Service", "status": "running"}

# Direct route for app.js
@app.get("/app.js")
async def serve_app_js():
    """Serve the main JavaScript file"""
    try:
        app_js_path = "../frontend/public/app.js"
        if os.path.exists(app_js_path):
            with open(app_js_path, 'r') as f:
                return Response(content=f.read(), media_type="application/javascript")
        raise HTTPException(status_code=404, detail="app.js not found")
    except Exception as e:
        logger.error(f"Error serving app.js: {str(e)}")
        raise HTTPException(status_code=500, detail="Error serving app.js")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "pdf-processor",
        "version": "1.0.0"
    }

# Session Management Endpoints
@app.post("/session/create")
async def create_session():
    """Creates new session for user"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")
        
        session_id = await db_manager.create_session()
        if session_id:
            return {
                "session_id": session_id,
                "expires_in_hours": None,
                "message": "Permanent session created successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create session")
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating session")

@app.get("/session/validate/{session_id}")
async def validate_session(session_id: str):
    """Validates if session is still active"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")
        
        is_valid = await db_manager.validate_session(session_id)
        return {
            "session_id": session_id,
            "valid": is_valid,
            "message": "Session is active" if is_valid else "Session expired or invalid"
        }
    except Exception as e:
        logger.error(f"Error validating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Error validating session")

@app.delete("/session/cleanup")
async def cleanup_sessions():
    """Manual cleanup trigger for expired sessions"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")
        
        count = await db_manager.cleanup_expired_sessions()
        return {
            "cleaned_sessions": count,
            "message": f"Cleaned up {count} expired sessions"
        }
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {str(e)}")
        raise HTTPException(status_code=500, detail="Error cleaning up sessions")

# Session-Aware Node Endpoints
@app.get("/session/{session_id}/nodes")
async def get_session_nodes(session_id: str):
    """Get all nodes for a specific session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        nodes = await db_manager.get_session_nodes(session_id)
        return {"session_id": session_id, "nodes": nodes, "total": len(nodes)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session nodes: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching session nodes")

@app.post("/session/{session_id}/nodes")
async def create_session_node(session_id: str, node_data: dict):
    """Create a new node in a session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Validate required fields
        if "node_id" not in node_data:
            raise HTTPException(status_code=400, detail="node_id is required")

        # Check if node already exists in this session
        existing_nodes = await db_manager.get_session_nodes(session_id)
        if any(node["node_id"] == node_data["node_id"] for node in existing_nodes):
            raise HTTPException(status_code=400, detail=f"Node {node_data['node_id']} already exists in this session")

        success = await db_manager.create_session_node(session_id, node_data)
        if success:
            return {"success": True, "message": f"Node {node_data['node_id']} created successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to create session node")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating session node: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating session node")

@app.delete("/session/{session_id}/nodes/{node_id}")
async def delete_session_node(session_id: str, node_id: str):
    """Delete a node and all its relationships from a session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Delete the node and its relationships (atomic operation)
        success = await db_manager.delete_session_node(session_id, node_id)
        if success:
            return {"success": True, "message": f"Node {node_id} deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found in session")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session node: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting session node")

@app.get("/session/{session_id}/relationships")
async def get_session_relationships(session_id: str):
    """Get all relationships for a specific session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        relationships = await db_manager.get_session_relationships(session_id)
        return {"session_id": session_id, "relationships": relationships, "total": len(relationships)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session relationships: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching session relationships")

@app.post("/session/{session_id}/relationships/bulk")
async def bulk_create_session_relationships(session_id: str, relationships_data: dict):
    """Create multiple relationships in a session (for CSV import)"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Validate required field
        if "relationships" not in relationships_data:
            raise HTTPException(status_code=400, detail="relationships array is required")

        relationships = relationships_data["relationships"]
        success = await db_manager.bulk_create_relationships(session_id, relationships)

        if success:
            return {"success": True, "message": f"Created {len(relationships)} relationships successfully", "count": len(relationships)}
        else:
            raise HTTPException(status_code=500, detail="Failed to create relationships")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk creating relationships: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating relationships")

@app.post("/session/{session_id}/relationships")
async def create_session_relationship(session_id: str, relationship: RelationshipCreate):
    """Create a single relationship in a session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Create relationship data
        relationship_data = {
            "from": relationship.from_node_id,
            "to": relationship.to_node_id,
            "type": relationship.relationship_type,
            "explanation": relationship.explanation,
            "created_by": relationship.created_by,
            "confidence_score": relationship.confidence_score
        }

        success = await db_manager.create_session_relationship(session_id, relationship_data)
        if success:
            return {"success": True, "message": "Relationship created successfully", "relationship": relationship_data}
        else:
            raise HTTPException(status_code=500, detail="Failed to create relationship")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating relationship: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating relationship")

@app.delete("/session/{session_id}/relationships/{relationship_id}")
async def delete_session_relationship(session_id: str, relationship_id: int):
    """Delete a specific relationship in a session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        success = await db_manager.delete_session_relationship(session_id, relationship_id)
        if success:
            return {"success": True, "message": f"Relationship {relationship_id} deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Relationship not found or failed to delete")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting relationship: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting relationship")

@app.put("/session/{session_id}/relationships/{relationship_id}")
async def update_session_relationship(session_id: str, relationship_id: int, relationship_update: RelationshipUpdate):
    """Update a specific relationship in a session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Build update data (only include non-None fields)
        update_data = {}
        if relationship_update.relationship_type is not None:
            update_data["relationship_type"] = relationship_update.relationship_type
        if relationship_update.explanation is not None:
            update_data["explanation"] = relationship_update.explanation
        if relationship_update.confidence_score is not None:
            update_data["confidence_score"] = relationship_update.confidence_score

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        success = await db_manager.update_session_relationship(session_id, relationship_id, update_data)
        if success:
            return {"success": True, "message": f"Relationship {relationship_id} updated successfully", "updated_fields": list(update_data.keys())}
        else:
            raise HTTPException(status_code=404, detail="Relationship not found or failed to update")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating relationship: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating relationship")

@app.post("/session/{session_id}/nodes/{node_id}/content")
async def save_session_node_content(session_id: str, node_id: str, content: ContentCreate):
    """Save content for a node in a session with transaction safety"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        content_data = {
            "explanation": content.explanation,
            "real_world_example": content.real_world_example,
            "textbook_content": content.textbook_content,
            "memory_trick": content.memory_trick
        }
        
        success = await db_manager.save_session_node_content(session_id, node_id, content_data)
        if success:
            return {
                "message": "Content saved successfully",
                "session_id": session_id,
                "node_id": node_id,
                "saved_at": "now"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save content")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving session node content: {str(e)}")
        raise HTTPException(status_code=500, detail="Error saving content")

@app.get("/session/{session_id}/nodes/{node_id}/content")
async def get_session_node_content(session_id: str, node_id: str):
    """Get content for a specific node in a session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        content = await db_manager.get_session_node_content(session_id, node_id)
        return {
            "session_id": session_id,
            "node_id": node_id,
            **content
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session node content: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching content")

# Auto-Save Endpoint for Step 2.4
@app.put("/session/{session_id}/nodes/{node_id}/auto-save")
async def auto_save_node_content(session_id: str, node_id: str, content: dict):
    """Auto-save content as component sequence with transaction safety"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")
        
        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            # Auto-save fails silently for invalid sessions
            return {"status": "session_expired", "message": "Session expired"}
        
        # Convert frontend component sequence to database format
        components_dict = []
        if "components" in content:
            for comp in content["components"]:
                components_dict.append({
                    "type": comp["type"],
                    "order": comp["order"],
                    "parameters": comp["parameters"],
                    "confidence": comp.get("confidence", 1.0)
                })
        
        # Save component sequence to database
        success = await db_manager.save_node_components(
            node_id, components_dict, 
            content.get("suggested_template", "text-heavy"),
            content.get("overall_confidence", 1.0)
        )
        
        if success:
            from datetime import datetime
            return {
                "status": "saved",
                "message": "Auto-saved successfully",
                "saved_at": datetime.now().isoformat(),
                "session_id": session_id,
                "node_id": node_id,
                "components_saved": len(components_dict)
            }
        else:
            return {"status": "error", "message": "Auto-save failed"}
    except Exception as e:
        logger.error(f"Auto-save error: {str(e)}")
        return {"status": "error", "message": "Auto-save failed"}

@app.put("/session/{session_id}/positions")
async def save_node_positions(session_id: str, positions_update: PositionsUpdate):
    """Save node positions for a session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Convert PositionData objects to dict
        positions_dict = {}
        for node_id, position_data in positions_update.positions.items():
            positions_dict[node_id] = {"x": position_data.x, "y": position_data.y}

        # Save to database
        success = await db_manager.save_session_positions(session_id, positions_dict)

        if success:
            return {
                "status": "saved",
                "message": "Positions saved successfully",
                "session_id": session_id,
                "nodes_saved": len(positions_dict)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save positions")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving positions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/session/{session_id}/positions")
async def get_node_positions(session_id: str):
    """Get node positions for a session"""
    try:
        if not db_manager:
            raise HTTPException(status_code=500, detail="Database not available")

        # Validate session first
        is_valid = await db_manager.validate_session(session_id)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Load from database
        positions = await db_manager.load_session_positions(session_id)

        return {
            "status": "success",
            "session_id": session_id,
            "positions": positions
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading positions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/nodes")
async def get_nodes():
    try:
        # Return stored nodes or sample nodes if empty
        if not nodes_storage:
            sample_nodes = [
                NodeResponse(node_id="N001", title="Introduction to Fractions", chapter_id="CH01", created_at="2024-01-01T10:00:00Z"),
                NodeResponse(node_id="N002", title="Adding Fractions", chapter_id="CH01", created_at="2024-01-01T10:30:00Z"),
                NodeResponse(node_id="N003", title="Fraction Word Problems", chapter_id="CH01", created_at="2024-01-01T11:00:00Z")
            ]
            nodes_with_templates = []
            for node in sample_nodes:
                node_dict = node.dict()
                node_dict["assigned_template"] = template_assignments.get(node.node_id, None)
                nodes_with_templates.append(node_dict)
            return {"nodes": nodes_with_templates, "total": len(nodes_with_templates)}

        # Add template assignments to stored nodes
        nodes_with_templates = []
        for node in nodes_storage:
            node_dict = node.dict()
            node_dict["assigned_template"] = template_assignments.get(node.node_id, None)
            nodes_with_templates.append(node_dict)
        return {"nodes": nodes_with_templates, "total": len(nodes_with_templates)}
    except Exception as e:
        logger.error(f"Error fetching nodes: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching nodes")

@app.post("/nodes")
async def create_node(node: NodeCreate):
    try:
        # Check if node_id already exists
        if any(n.node_id == node.node_id for n in nodes_storage):
            raise HTTPException(status_code=400, detail=f"Node with ID {node.node_id} already exists")

        # Create new node response
        new_node = NodeResponse(
            node_id=node.node_id,
            title=node.title,
            chapter_id=node.chapter_id,
            created_at="2024-01-01T12:00:00Z"
        )

        # Add to storage
        nodes_storage.append(new_node)

        # Return success response with DOM update script
        response_html = f"""
        <script>
        // Update sidebar node list
        if (window.addNodeToSidebar) {{
            window.addNodeToSidebar('{new_node.node_id}', '{new_node.title}');
        }}
        // Trigger refresh event for any listeners
        if (window.dispatchEvent) {{
            window.dispatchEvent(new CustomEvent('nodeCreated', {{
                detail: {{
                    node_id: '{new_node.node_id}',
                    title: '{new_node.title}',
                    chapter_id: '{new_node.chapter_id}'
                }}
            }}));
        }}
        </script>
        """

        # Return both JSON data and HTML script
        return JSONResponse(content={
            "node_id": new_node.node_id,
            "title": new_node.title,
            "chapter_id": new_node.chapter_id,
            "created_at": new_node.created_at,
            "dom_update": response_html
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating node: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating node")

@app.post("/nodes/{node_id}/content", response_model=ContentResponse)
async def set_node_content(node_id: str, content: ContentCreate):
    """Store the 4 content types for a specific node"""

    # Validate node exists
    if not any(n.node_id == node_id for n in nodes_storage):
        raise HTTPException(status_code=404, detail="Node not found")

    # Store content
    node_content[node_id] = content

    # Generate content update script
    content_update_script = f"""
    <script>
    // Populate content fields in frontend
    if (window.populateContentFields) {{
        window.populateContentFields('{node_id}', {{
            explanation: `{content.explanation}`,
            real_world_example: `{content.real_world_example}`,
            textbook_content: `{content.textbook_content}`,
            memory_trick: `{content.memory_trick}`
        }});
    }}
    // Refresh preview with new content
    if (window.refreshPreview) {{
        window.refreshPreview('{node_id}');
    }}
    // Trigger content update event
    if (window.dispatchEvent) {{
        window.dispatchEvent(new CustomEvent('contentUpdated', {{
            detail: {{
                node_id: '{node_id}',
                content: {{
                    explanation: `{content.explanation}`,
                    real_world_example: `{content.real_world_example}`,
                    textbook_content: `{content.textbook_content}`,
                    memory_trick: `{content.memory_trick}`
                }}
            }}
        }}));
    }}
    </script>
    """

    return JSONResponse(content={
        "node_id": node_id,
        "explanation": content.explanation,
        "real_world_example": content.real_world_example,
        "textbook_content": content.textbook_content,
        "memory_trick": content.memory_trick,
        "dom_update": content_update_script
    })

@app.get("/nodes/{node_id}/content", response_model=ContentResponse)
async def get_node_content(node_id: str):
    """Retrieve content for a specific node"""
    if not any(n.node_id == node_id for n in nodes_storage):
        raise HTTPException(status_code=404, detail="Node not found")

    content = node_content.get(node_id, ContentCreate())
    return ContentResponse(node_id=node_id, **content.dict())

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        upload_dir = "../uploads/pdfs"
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, file.filename)

        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        result = await pdf_processor.process_pdf(file_path)

        return JSONResponse(content={
            "message": "PDF uploaded and processed successfully",
            "filename": file.filename,
            "file_path": file_path,
            "processing_result": result
        })

    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = os.path.splitext(file.filename.lower())[1]

    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only image files (JPG, PNG, GIF, WebP) are allowed")

    try:
        upload_dir = "../uploads/images"
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, file.filename)

        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        return JSONResponse(content={
            "message": "Image uploaded successfully",
            "filename": file.filename,
            "file_path": file_path,
            "url": f"/uploads/images/{file.filename}"
        })

    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")

@app.get("/nodes/{chapter_id}")
async def get_nodes(chapter_id: str):
    try:
        nodes = await db_manager.get_nodes_by_chapter(chapter_id)
        return {"chapter_id": chapter_id, "nodes": nodes}
    except Exception as e:
        logger.error(f"Error fetching nodes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching nodes: {str(e)}")

@app.post("/analyze-first-node")
async def analyze_first_node(request: dict):
    try:
        node_content = request.get("content", "")
        if not node_content:
            raise HTTPException(status_code=400, detail="No content provided")

        # Use the enhanced LLM analysis method
        result = await pdf_processor.analyze_node_with_metadata(node_content)
        return result
    except Exception as e:
        logger.error(f"Error analyzing first node: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing node: {str(e)}")

@app.post("/create-highlight-box", response_class=HTMLResponse)
async def create_highlight_box(request: HighlightBoxRequest):
    """
    Create a highlight box with content, title, and optional image
    Returns rendered HTML
    """
    try:
        rendered_html = template_renderer.render_highlight_box(
            content=request.content,
            title=request.title,
            image_url=request.image_url
        )
        return HTMLResponse(content=rendered_html)
    except Exception as e:
        logger.error(f"Error creating highlight box: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating highlight box: {str(e)}")

@app.get("/preview-highlight-box/{node_id}", response_class=HTMLResponse)
async def preview_highlight_box(node_id: str):
    """
    Preview highlight box for an existing node
    """
    try:
        # TODO: Fetch node data from database
        # For now, return a placeholder implementation
        sample_content = f"# Preview for Node {node_id}\n\nThis is a **preview** of the highlight box for node {node_id}.\n\n- Sample content\n- *Formatted text*\n- More details here"

        rendered_html = template_renderer.render_highlight_box(
            content=sample_content,
            title=f"Node {node_id} Preview",
            image_url=None
        )
        return HTMLResponse(content=rendered_html)
    except Exception as e:
        logger.error(f"Error previewing highlight box for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error previewing highlight box: {str(e)}")

@app.put("/update-highlight-box/{node_id}")
async def update_highlight_box(node_id: str, request: HighlightBoxUpdateRequest):
    """
    Update highlight box data for an existing node
    """
    try:
        # TODO: Save to database (will implement in database integration step)
        # For now, return success response with rendered preview

        rendered_html = template_renderer.render_highlight_box(
            content=request.content,
            title=request.title,
            image_url=request.image_url
        )

        return JSONResponse(content={
            "message": "Highlight box updated successfully",
            "node_id": node_id,
            "title": request.title,
            "content_preview": request.content[:100] + "..." if len(request.content) > 100 else request.content,
            "image_url": request.image_url,
            "rendered_html": rendered_html
        })
    except Exception as e:
        logger.error(f"Error updating highlight box for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating highlight box: {str(e)}")

@app.post("/render-template", response_class=HTMLResponse)
async def render_template_endpoint(request: TemplateRenderRequest):
    """
    Generic template renderer for any template type
    """
    try:
        # Validate template name
        valid_templates = ['text-heavy', 'visual-grid', 'mixed-media', 'simple-list', 'highlight-box', 'image-vs']
        if request.template_name not in valid_templates:
            raise HTTPException(status_code=400, detail=f"Invalid template name. Must be one of: {valid_templates}")

        # Prepare variables
        variables = request.variables or {}

        # Render the template
        rendered_html = template_renderer.render_any_template(
            template_name=request.template_name,
            content=request.content,
            title=request.title,
            **variables
        )

        return HTMLResponse(content=rendered_html)

    except Exception as e:
        logger.error(f"Error rendering template {request.template_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error rendering template: {str(e)}")

@app.post("/api/generate-svgs")
async def generate_svgs(request: GenerateSVGsRequest):
    """
    Generate 3 clean SVG codes using Claude AI based on context, titles, and descriptions
    Returns array of 3 SVG code strings
    """
    try:
        # Validate input
        if len(request.titles) != 3 or len(request.descriptions) != 3:
            raise HTTPException(status_code=400, detail="Must provide exactly 3 titles and 3 descriptions")

        if not CLAUDE_AVAILABLE:
            # Demo mode - return sample SVGs
            logger.info("Claude not available - returning demo SVGs")
            demo_svgs = [
                '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="80" fill="#6366f1"/><text x="100" y="115" font-size="48" fill="white" text-anchor="middle">1</text></svg>',
                '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="20" width="160" height="160" fill="#8b5cf6" rx="10"/><text x="100" y="115" font-size="48" fill="white" text-anchor="middle">2</text></svg>',
                '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><polygon points="100,20 180,180 20,180" fill="#a855f7"/><text x="100" y="140" font-size="48" fill="white" text-anchor="middle">3</text></svg>'
            ]
            return {"svgs": demo_svgs}

        # Build prompt for Claude
        prompt = f"""You are an expert SVG illustrator for educational content. Generate 3 clean, minimal SVG illustrations.

Context: {request.context}

Generate SVG for these 3 items:
1. Title: {request.titles[0]}
   Description: {request.descriptions[0]}

2. Title: {request.titles[1]}
   Description: {request.descriptions[1]}

3. Title: {request.titles[2]}
   Description: {request.descriptions[2]}

Requirements:
- Return ONLY a JSON object with format: {{"svg1": "<svg>...</svg>", "svg2": "<svg>...</svg>", "svg3": "<svg>...</svg>"}}
- Each SVG must be clean, minimal, and educational
- Use viewBox="0 0 200 200" for consistent sizing
- No XML declarations, no comments
- Use simple geometric shapes and clear colors
- Make illustrations relevant to the titles and descriptions
- Keep SVG code compact and readable
- Use appropriate colors for educational content (blues, purples, greens)

Return only the JSON, no other text."""

        # Call Claude
        message = claude_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse response
        response_text = message.content[0].text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()

        # Parse JSON
        svg_data = json.loads(response_text)

        # Extract SVGs
        svgs = [
            svg_data.get("svg1", ""),
            svg_data.get("svg2", ""),
            svg_data.get("svg3", "")
        ]

        # Validate SVGs
        for i, svg in enumerate(svgs):
            if not svg or not svg.strip().startswith('<svg'):
                raise ValueError(f"Invalid SVG generated for item {i+1}")

        logger.info(f"Generated 3 SVGs successfully with context: {request.context[:50]}...")
        return {"svgs": svgs}

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {str(e)}")
        raise HTTPException(status_code=500, detail="AI returned invalid format")
    except Exception as e:
        logger.error(f"Error generating SVGs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating SVGs: {str(e)}")

@app.get("/preview-template/{template_name}", response_class=HTMLResponse)
async def preview_template(template_name: str):
    """
    Preview any template with sample content
    """
    try:
        # Validate template name
        valid_templates = ['text-heavy', 'visual-grid', 'mixed-media', 'simple-list', 'highlight-box', 'image-vs']
        if template_name not in valid_templates:
            raise HTTPException(status_code=400, detail=f"Invalid template name. Must be one of: {valid_templates}")

        # Sample content for each template
        sample_content = {
            'text-heavy': "# Understanding Fractions\n\nFractions represent **parts of a whole**. When we write 3/4, we're showing that something has been divided into 4 equal parts, and we're talking about 3 of those parts.\n\n## Key Concepts\n\n*Reading fractions* is easier when you remember:\n- The **top number** (numerator) tells you how many pieces you have\n- The **bottom number** (denominator) tells you how many pieces the whole was divided into\n\nFor example, if you eat 3 slices of a pizza that was cut into 4 pieces, you've eaten **3/4** of the pizza.",

            'visual-grid': """<div class="grid-item">
                <div class="grid-item-image">
                    <div class="grid-item-placeholder">📊 Visual Example</div>
                </div>
                <div class="grid-item-content">
                    <h3 class="grid-item-title">Pizza Fractions</h3>
                    <div class="grid-item-text">
                        <p>When a pizza is cut into **4 equal slices** and you eat **3 slices**, you have eaten 3/4 of the pizza.</p>
                    </div>
                </div>
            </div>
            <div class="grid-item">
                <div class="grid-item-image">
                    <div class="grid-item-placeholder">🍎 Real Example</div>
                </div>
                <div class="grid-item-content">
                    <h3 class="grid-item-title">Apple Quarters</h3>
                    <div class="grid-item-text">
                        <p>Cut an apple into *4 quarters*. Each piece is **1/4** of the whole apple.</p>
                    </div>
                </div>
            </div>""",

            'mixed-media': """<div class="section-layout">
                <div class="section-image">
                    <div class="image-placeholder">🥧 Pie Chart</div>
                </div>
                <div class="section-text">
                    <h2>Visual Learning</h2>
                    <p>The best way to understand fractions is to **see them in action**. A pie chart shows how fractions represent parts of a whole.</p>
                    <p>When you see 1/2, imagine cutting a pie exactly in half. Each piece is *one half* of the original pie.</p>
                </div>
            </div>
            <div class="callout-box">
                <h3>Memory Trick</h3>
                <p>Remember: The **bigger the bottom number**, the **smaller each piece** becomes!</p>
            </div>""",

            'simple-list': """# How to Read Fractions

## Step-by-Step Process

- **Look at the top number** (numerator) - this tells you how many pieces you have
- **Look at the bottom number** (denominator) - this tells you how many total pieces the whole was divided into
- **Put it together**: "I have [top] out of [bottom] equal pieces"

## Examples to Practice

- 1/2 = "one out of two pieces" = *one half*
- 3/4 = "three out of four pieces" = **three quarters**
- 5/8 = "five out of eight pieces" = *five eighths*

## Quick Memory Tips

- The **bigger** the denominator, the **smaller** each piece
- When numerator = denominator, you have the *whole thing* (like 4/4 = 1)
- When numerator = 1, you have **one piece** of whatever size the denominator makes""",

            'highlight-box': "# Reading Fractions Made Simple\n\nThe **top number** tells you how many slices you took.\nThe **bottom number** tells you how many slices the pizza was cut into.\n\nSo 3/4 means: *I took 3 slices from a pizza cut into 4 pieces!*",

            'image-vs': """<div class="comparison-section">
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <div class="item-image">
                            <div class="image-placeholder">🍕 Pizza Visual</div>
                        </div>
                        <h3 class="item-title">Fractions with Visual</h3>
                        <div class="item-description">
                            <p>When you <strong>see fractions</strong> with pictures like pizza slices, it's easy to understand that 3/4 means 3 out of 4 pieces.</p>
                        </div>
                    </div>
                    <div class="vs-divider">VS</div>
                    <div class="comparison-item">
                        <div class="item-image">
                            <div class="image-placeholder">🔢 Numbers Only</div>
                        </div>
                        <h3 class="item-title">Fractions as Numbers</h3>
                        <div class="item-description">
                            <p>When fractions are <em>just numbers</em> like 3/4, you need to imagine the visual in your mind to understand what it means.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="conclusion-section">
                <div class="conclusion-content">
                    <p><strong>Conclusion:</strong> Visual fractions help you understand the concept better, but learning to work with numerical fractions is essential for math!</p>
                </div>
            </div>"""
        }

        sample_title = {
            'text-heavy': "Understanding Fractions - Complete Guide",
            'visual-grid': "Fraction Examples in Action",
            'mixed-media': "Learning Fractions Visually",
            'simple-list': "How to Read Fractions",
            'highlight-box': "Quick Fraction Tip",
            'image-vs': "Visual vs Numerical Fractions"
        }

        # Render the template with sample content
        rendered_html = template_renderer.render_any_template(
            template_name=template_name,
            content=sample_content[template_name],
            title=sample_title[template_name]
        )

        return HTMLResponse(content=rendered_html)

    except Exception as e:
        logger.error(f"Error previewing template {template_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error previewing template: {str(e)}")

# AI Command Proxy - Single endpoint for Comet to control CMS
@app.post("/ai-command")
async def ai_command(command: dict):
    """Single proxy endpoint for AI to control CMS with visual feedback"""
    try:
        action = command["action"]
        data = command["data"]

        if action == "create_node":
            # Call existing node creation
            node_data = NodeCreate(**data)
            return await create_node(node_data)

        elif action == "assign_template":
            # Call existing template assignment
            assignment_data = TemplateAssignment(**data)
            return await assign_template(data["node_id"], assignment_data)

        elif action == "add_content":
            # Call existing content addition
            content_data = ContentCreate(**data)
            return await set_node_content(data["node_id"], content_data)

        else:
            return {"error": f"Unknown action: {action}"}

    except Exception as e:
        logger.error(f"Error executing AI command: {str(e)}")
        return {"error": f"Command failed: {str(e)}"}

# Streaming Progress Endpoint for PDF Analysis
@app.post("/nodes/{node_id}/analyze-pdf-vision-stream")
async def analyze_pdf_vision_streaming(node_id: str, file: UploadFile = File(...), context: str = ""):
    """
    Upload PDF and get real-time progress updates via Server-Sent Events
    Returns streaming progress updates during multi-page processing
    """
    # Enhanced input validation
    
    # Validate file type and extension
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Validate file size (50MB max)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Reset file pointer after reading for size check
    await file.seek(0)
    
    # Validate filename for security (prevent path traversal)
    import re
    if not re.match(r'^[a-zA-Z0-9_\-\.\s]+\.pdf$', file.filename):
        raise HTTPException(status_code=400, detail="Invalid filename. Use only letters, numbers, spaces, dots, hyphens and underscores")
    
    # Validate context length
    if context and len(context) > 1000:
        raise HTTPException(status_code=400, detail="Context text too long. Maximum 1000 characters")

    # Note: Node validation removed - database operations will handle missing nodes gracefully

    async def generate_progress_stream():
        try:
            # Save uploaded PDF temporarily
            upload_dir = "../uploads/pdfs"
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, f"{node_id}_{file.filename}")

            # Write file to disk
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)

            # Validate PDF format by checking file header
            try:
                with open(file_path, "rb") as f:
                    header = f.read(8)
                    if not header.startswith(b'%PDF-'):
                        raise ValueError("Invalid PDF format - file header check failed")
            except Exception as format_error:
                error_update = {
                    "status": "error",
                    "error": f"Invalid PDF format: {str(format_error)}"
                }
                yield f"data: {json.dumps(error_update)}\n\n"
                return

            # Additional PDF validation using PyMuPDF if available
            # Skip this validation if PyMuPDF is not installed - vision API will handle it
            try:
                from vision_processor import PYMUPDF_AVAILABLE
                if vision_processor and PYMUPDF_AVAILABLE:
                    try:
                        # Try to get page count to validate PDF structure
                        _, page_count = vision_processor.convert_pdf_page_to_image(file_path, 1)
                        if page_count <= 0:
                            raise ValueError("PDF contains no readable pages")
                        if page_count > vision_processor.max_total_pages:
                            warning_update = {
                                "status": "warning",
                                "message": f"PDF has {page_count} pages, will process first {vision_processor.max_total_pages} only"
                            }
                            yield f"data: {json.dumps(warning_update)}\n\n"
                    except Exception as pdf_error:
                        error_update = {
                            "status": "error",
                            "error": f"PDF validation failed: {str(pdf_error)}"
                        }
                        yield f"data: {json.dumps(error_update)}\n\n"
                        return
            except ImportError:
                # PyMuPDF not available, skip validation
                pass

            # Progress tracking variables
            progress_updates = []
            final_result = None

            def progress_callback(update):
                progress_updates.append(update)

            # Call vision processor with progress callback
            if vision_processor:
                # Run in thread to avoid blocking
                import threading
                result_container = {}
                exception_container = {}

                def run_analysis():
                    try:
                        result = vision_processor.analyze_pdf_for_components(
                            pdf_path=file_path,
                            context=context if context else None,
                            progress_callback=progress_callback
                        )
                        result_container['result'] = result
                    except Exception as e:
                        logger.error(f"Vision processing error: {str(e)}")
                        print(f"ERROR: Vision processing failed: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        exception_container['error'] = str(e)

                # Start analysis in background thread
                thread = threading.Thread(target=run_analysis)
                thread.start()

                # Stream progress updates
                while thread.is_alive() or progress_updates:
                    if progress_updates:
                        update = progress_updates.pop(0)
                        yield f"data: {json.dumps(update)}\n\n"
                    await asyncio.sleep(0.1)  # Small delay to prevent busy waiting

                thread.join()

                # Send final result or error
                if 'result' in result_container:
                    final_update = {
                        "status": "finished",
                        "result": result_container['result']
                    }
                else:
                    final_update = {
                        "status": "error",
                        "error": exception_container.get('error', 'Unknown error occurred')
                    }
                
                yield f"data: {json.dumps(final_update)}\n\n"
            else:
                # Demo mode without vision processor
                demo_updates = [
                    {"status": "started", "current_page": 0, "total_pages": 3, "message": "Starting analysis of 3 pages"},
                    {"status": "processing", "current_page": 1, "total_pages": 3, "message": "Processing page 1 of 3"},
                    {"status": "page_completed", "current_page": 1, "total_pages": 3, "message": "Completed page 1 of 3"},
                    {"status": "processing", "current_page": 2, "total_pages": 3, "message": "Processing page 2 of 3"},
                    {"status": "page_completed", "current_page": 2, "total_pages": 3, "message": "Completed page 2 of 3"},
                    {"status": "processing", "current_page": 3, "total_pages": 3, "message": "Processing page 3 of 3"},
                    {"status": "page_completed", "current_page": 3, "total_pages": 3, "message": "Completed page 3 of 3"},
                    {"status": "completed", "current_page": 3, "total_pages": 3, "message": "Analysis completed - processed 3 pages"}
                ]
                
                for update in demo_updates:
                    yield f"data: {json.dumps(update)}\n\n"
                    await asyncio.sleep(0.5)  # Simulate processing delay

                # Send demo final result
                demo_result = {
                    "status": "finished",
                    "result": {
                        "component_sequence": [
                            {"type": "paragraph", "order": 1, "parameters": {"text": "Demo: Multi-page processing with progress updates"}, "confidence": 0.9}
                        ],
                        "suggested_template": "text-heavy",
                        "overall_confidence": 0.85,
                        "processing_notes": "Demo mode - real processing requires PyMuPDF"
                    }
                }
                yield f"data: {json.dumps(demo_result)}\n\n"

        except Exception as e:
            error_update = {
                "status": "error", 
                "error": f"Stream processing failed: {str(e)}"
            }
            yield f"data: {json.dumps(error_update)}\n\n"

    return StreamingResponse(
        generate_progress_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

# Enhanced Vision Processing Endpoint for Component Sequences  
@app.post("/nodes/{node_id}/analyze-pdf-vision")
async def analyze_pdf_vision_for_components(node_id: str, file: UploadFile = File(...), page_number: int = 1, context: str = ""):
    """
    Upload PDF and get AI-suggested component sequence for specific node
    Returns structured component sequence that can populate the frontend editor
    """
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Note: Node validation removed - database operations will handle missing nodes gracefully

    try:
        # Save uploaded PDF temporarily
        upload_dir = "../uploads/pdfs"
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, f"{node_id}_{file.filename}")

        # Write file to disk
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Call enhanced vision processor for component sequence analysis
        if not vision_processor:
            # Return demo response showing the new multi-page structure
            vision_result = {
                "component_sequence": [
                    {
                        "type": "heading",
                        "order": 1,
                        "parameters": {"text": "Demo: Multi-page processing implemented"},
                        "confidence": 0.9
                    },
                    {
                        "type": "paragraph", 
                        "order": 2,
                        "parameters": {"text": "Vision processor unavailable - install PyMuPDF to test real PDF processing"},
                        "confidence": 0.8
                    }
                ],
                "suggested_template": "text-heavy",
                "overall_confidence": 0.85,
                "processing_notes": f"Demo response - would process all pages of {file.filename}",
                "demo_info": "Multi-page PDF processing is implemented but requires PyMuPDF dependency"
            }
        else:
            vision_result = vision_processor.analyze_pdf_for_components(
                pdf_path=file_path,
                page_number=page_number,
                context=context if context else None
            )

        # Validate component types against known components
        valid_component_types = [
            "heading", "paragraph", "definition", "step-sequence",
            "worked-example", "memory-trick", "four-pictures",
            "three-pictures", "two-pictures"
        ]

        # Filter and validate component sequence
        validated_components = []
        for component in vision_result.get("component_sequence", []):
            if component.get("type") in valid_component_types:
                validated_components.append(component)
            else:
                logger.warning(f"Invalid component type suggested: {component.get('type')}")

        # If no valid components, provide fallback
        if not validated_components:
            validated_components = [{
                "type": "paragraph",
                "order": 1,
                "parameters": {"text": "Unable to analyze PDF content structure"},
                "confidence": 0.2
            }]

        # Structure response for frontend consumption
        response_data = {
            "node_id": node_id,
            "filename": file.filename,
            "page_number": page_number,
            "component_sequence": validated_components,
            "suggested_template": vision_result.get("suggested_template", "text-heavy"),
            "overall_confidence": vision_result.get("overall_confidence", 0.5),
            "processing_notes": vision_result.get("processing_notes", "Vision analysis completed"),
            "total_components": len(validated_components),
            "file_path": file_path
        }

        logger.info(f"Vision analysis completed for node {node_id}: {len(validated_components)} components suggested")
        return JSONResponse(content=response_data)

    except Exception as e:
        logger.error(f"Error in vision processing for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Vision processing failed: {str(e)}")

# Component Sequence CRUD Endpoints

@app.get("/nodes/{node_id}/components", response_model=ComponentSequenceResponse)
async def get_node_components(node_id: str):
    """Retrieve component sequence for a specific node (using database)"""
    try:
        # Note: Node validation removed - database operations will handle missing nodes gracefully

        # Get component sequence from database
        db_components = await db_manager.get_node_components(node_id)

        if db_components:
            # Convert database results to ComponentItem format
            components = []
            for db_comp in db_components:
                components.append(ComponentItem(
                    type=db_comp["component_type"],
                    order=db_comp["component_order"],
                    parameters=db_comp["parameters"],
                    confidence=db_comp["confidence_score"]
                ))

            # For now, use default template (will be enhanced in later chunks)
            return ComponentSequenceResponse(
                node_id=node_id,
                components=components,
                suggested_template="text-heavy",  # TODO: Store template in database
                overall_confidence=sum(c.confidence for c in components) / len(components) if components else 0.0,
                total_components=len(components),
                created_at=db_components[0]["created_at"] if db_components else None
            )
        else:
            # Return empty sequence
            return ComponentSequenceResponse(
                node_id=node_id,
                components=[],
                suggested_template="text-heavy",
                overall_confidence=0.0,
                total_components=0,
                created_at=None
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving components for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving components")

@app.post("/nodes/{node_id}/components")
async def save_node_components(node_id: str, sequence: ComponentSequence):
    """Save complete component sequence for a node"""
    try:
        # Note: Node validation removed - database operations will handle missing nodes gracefully

        # Validate component types
        from component_schemas import COMPONENT_SCHEMAS
        valid_types = list(COMPONENT_SCHEMAS.keys())

        for component in sequence.components:
            if component.type not in valid_types:
                raise HTTPException(status_code=400, detail=f"Invalid component type: {component.type}")

        # Set node_id and timestamp
        sequence.node_id = node_id
        from datetime import datetime
        sequence.created_at = datetime.now().isoformat()

        # Convert components to dict format for database
        components_dict = []
        for comp in sequence.components:
            components_dict.append({
                "type": comp.type,
                "order": comp.order,
                "parameters": comp.parameters,
                "confidence": comp.confidence
            })

        # Save to database
        success = await db_manager.save_node_components(
            node_id, components_dict, sequence.suggested_template, sequence.overall_confidence
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to save component sequence to database")

        logger.info(f"Saved component sequence for node {node_id}: {len(sequence.components)} components")

        return {"message": f"Component sequence saved for node {node_id}", "total_components": len(sequence.components)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving components for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error saving components")

@app.put("/nodes/{node_id}/components/{order}")
async def update_node_component(node_id: str, order: int, component: ComponentItem):
    """Update specific component in sequence"""
    try:
        # Validate component type
        from component_schemas import COMPONENT_SCHEMAS
        if component.type not in COMPONENT_SCHEMAS:
            raise HTTPException(status_code=400, detail=f"Invalid component type: {component.type}")

        # Convert component to dict format for database
        component_dict = {
            "type": component.type,
            "order": component.order,
            "parameters": component.parameters,
            "confidence": component.confidence
        }

        # Update component in database
        success = await db_manager.update_node_component(node_id, order, component_dict)

        if not success:
            raise HTTPException(status_code=404, detail=f"Component with order {order} not found or update failed")

        logger.info(f"Updated component {order} for node {node_id}")

        return {"message": f"Component {order} updated for node {node_id}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating component for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error updating component")

@app.delete("/nodes/{node_id}/components/{order}")
async def delete_node_component(node_id: str, order: int):
    """Remove component from sequence and reorder"""
    try:
        # Delete component from database (includes automatic reordering)
        success = await db_manager.delete_node_component(node_id, order)

        if not success:
            raise HTTPException(status_code=404, detail=f"Component with order {order} not found")

        # Get remaining component count
        remaining_components = await db_manager.get_node_components(node_id)
        remaining_count = len(remaining_components)

        logger.info(f"Deleted component {order} from node {node_id}, {remaining_count} components remaining")

        return {"message": f"Component {order} deleted from node {node_id}", "remaining_components": remaining_count}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting component for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting component")

@app.post("/nodes/{node_id}/components/reorder")
async def reorder_node_components(node_id: str, new_order: List[int]):
    """Reorder components based on provided order array"""
    try:
        # Get current components to validate reorder request
        current_components = await db_manager.get_node_components(node_id)

        if not current_components:
            raise HTTPException(status_code=404, detail=f"No component sequence found for node {node_id}")

        # Validate new order array
        if len(new_order) != len(current_components):
            raise HTTPException(status_code=400, detail="New order array length must match number of components")

        if set(new_order) != set(range(1, len(current_components) + 1)):
            raise HTTPException(status_code=400, detail="New order must contain all numbers from 1 to component count")

        # Reorder components in database
        success = await db_manager.reorder_node_components(node_id, new_order)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to reorder components")

        logger.info(f"Reordered components for node {node_id}")

        return {"message": f"Components reordered for node {node_id}", "new_order": new_order}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reordering components for node {node_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error reordering components")


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting CMS API with complete database migration - all component operations now persist")
    uvicorn.run(app, host="0.0.0.0", port=8001)