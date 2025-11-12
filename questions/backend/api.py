"""
FastAPI router for Question CRUD operations.
5 endpoints: GET list, POST create, GET single, PUT update, DELETE
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import json
import logging
from datetime import datetime

from questions.backend.models import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionListResponse,
    HintModel,
    PrerequisiteModel,
    VisualSolution
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/questions", tags=["questions"])

# Database manager will be injected from main.py
db_manager = None


def set_db_manager(manager):
    """Set the database manager instance (called from main.py)"""
    global db_manager
    db_manager = manager


async def get_db():
    """Get database manager, raise if not available"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not available")
    return db_manager


# Helper functions

async def serialize_question_to_db(question_data: QuestionCreate) -> dict:
    """Convert QuestionCreate to database format"""
    return {
        "node_id": question_data.node_id,
        "session_id": question_data.session_id,
        "type": question_data.type,
        "text": question_data.text,
        "difficulty": question_data.difficulty,
        "band": question_data.band,
        "tag": question_data.tag,
        "remark": question_data.remark,
        "type_specific_data": json.dumps(question_data.type_specific_data) if question_data.type_specific_data else None,
        "solution_standard": question_data.solution_standard,
        "solution_smart": question_data.solution_smart,
        "visual_solution": json.dumps(question_data.visual_solution.model_dump()) if question_data.visual_solution else None,
    }


async def deserialize_question_from_db(row: dict, hints: List[dict], prerequisites: List[dict]) -> QuestionResponse:
    """Convert database row to QuestionResponse"""
    return QuestionResponse(
        id=row["id"],
        node_id=row["node_id"],
        session_id=row["session_id"],
        type=row["type"],
        text=row["text"],
        difficulty=row["difficulty"],
        band=row["band"],
        tag=row["tag"] or "",
        remark=row["remark"],
        type_specific_data=json.loads(row["type_specific_data"]) if row["type_specific_data"] else None,
        solution_standard=row["solution_standard"],
        solution_smart=row["solution_smart"],
        visual_solution=VisualSolution(**json.loads(row["visual_solution"])) if row["visual_solution"] else None,
        hints=[HintModel(**h) for h in hints],
        prerequisites=[PrerequisiteModel(**p) for p in prerequisites],
        created_at=row["created_at"],
        updated_at=row["updated_at"]
    )


# Endpoint 1: GET list of questions for a node
@router.get("/session/{session_id}/node/{node_id}/questions", response_model=QuestionListResponse)
async def get_questions(
    session_id: str,
    node_id: int,
    band: Optional[int] = Query(None, ge=1, le=5),
    difficulty_min: Optional[float] = Query(None, ge=-3, le=3),
    difficulty_max: Optional[float] = Query(None, ge=-3, le=3),
    tags: Optional[str] = Query(None)
):
    """
    Get all questions for a specific node in a session with optional filtering.

    Query parameters:
    - band: Filter by band (1-5)
    - difficulty_min: Minimum difficulty (-3 to 3)
    - difficulty_max: Maximum difficulty (-3 to 3)
    - tags: Comma-separated list of tags (conceptual,analytical,application,computational)
    """
    db = await get_db()

    try:
        # Build query with filters
        query = "SELECT * FROM questions WHERE session_id = :session_id AND node_id = :node_id"
        params = {"session_id": session_id, "node_id": node_id}

        if band is not None:
            query += " AND band = :band"
            params["band"] = band

        if difficulty_min is not None:
            query += " AND difficulty >= :difficulty_min"
            params["difficulty_min"] = difficulty_min

        if difficulty_max is not None:
            query += " AND difficulty <= :difficulty_max"
            params["difficulty_max"] = difficulty_max

        if tags:
            tag_list = tags.split(',')
            placeholders = ','.join([f':tag{i}' for i in range(len(tag_list))])
            query += f" AND tag IN ({placeholders})"
            for i, tag in enumerate(tag_list):
                params[f'tag{i}'] = tag.strip()

        query += " ORDER BY created_at DESC"

        # Execute query
        question_rows = await db.execute_query(query, params)

        # Get total count (without filters)
        total_query = "SELECT COUNT(*) as count FROM questions WHERE session_id = :session_id AND node_id = :node_id"
        total_result = await db.execute_query(total_query, {"session_id": session_id, "node_id": node_id})
        total_count = total_result[0]["count"] if total_result else 0

        # Load hints and prerequisites for each question
        questions = []
        for row in question_rows:
            question_id = row["id"]

            # Get hints
            hints_query = "SELECT * FROM question_hints WHERE question_id = :question_id ORDER BY hint_order"
            hints = await db.execute_query(hints_query, {"question_id": question_id})

            # Get prerequisites
            prereqs_query = "SELECT * FROM question_prerequisites WHERE question_id = :question_id"
            prerequisites = await db.execute_query(prereqs_query, {"question_id": question_id})

            # Deserialize and add to response
            question = await deserialize_question_from_db(row, hints, prerequisites)
            questions.append(question)

        return QuestionListResponse(
            questions=questions,
            total=total_count,
            filtered=len(questions)
        )

    except Exception as e:
        logger.error(f"Error getting questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get questions: {str(e)}")


# Endpoint 2: POST create new question
@router.post("/session/{session_id}/node/{node_id}/questions", response_model=QuestionResponse)
async def create_question(session_id: str, node_id: int, question: QuestionCreate):
    """Create a new question for a specific node"""
    db = await get_db()

    # Ensure session_id and node_id match
    if question.session_id != session_id or question.node_id != node_id:
        raise HTTPException(status_code=400, detail="session_id and node_id must match URL parameters")

    try:
        # Serialize question data
        question_data = await serialize_question_to_db(question)

        # Insert question
        query = """
        INSERT INTO questions (
            node_id, session_id, type, text, difficulty, band, tag, remark,
            type_specific_data, solution_standard, solution_smart, visual_solution,
            created_at, updated_at
        ) VALUES (
            :node_id, :session_id, :type, :text, :difficulty, :band, :tag, :remark,
            :type_specific_data, :solution_standard, :solution_smart, :visual_solution,
            datetime('now'), datetime('now')
        )
        """
        question_id = await db.execute_insert(query, question_data)

        # Insert hints
        for hint in question.hints:
            hint_query = """
            INSERT INTO question_hints (question_id, hint_order, level, text, is_interactive, correct_answer)
            VALUES (:question_id, :hint_order, :level, :text, :is_interactive, :correct_answer)
            """
            await db.execute_insert(hint_query, {
                "question_id": question_id,
                "hint_order": hint.hint_order,
                "level": hint.level,
                "text": hint.text,
                "is_interactive": hint.is_interactive,
                "correct_answer": hint.correct_answer
            })

        # Insert prerequisites
        for prereq in question.prerequisites:
            prereq_query = """
            INSERT INTO question_prerequisites (question_id, prerequisite_id, prerequisite_name, percentage)
            VALUES (:question_id, :prerequisite_id, :prerequisite_name, :percentage)
            """
            await db.execute_insert(prereq_query, {
                "question_id": question_id,
                "prerequisite_id": prereq.prerequisite_id,
                "prerequisite_name": prereq.prerequisite_name,
                "percentage": prereq.percentage
            })

        # Fetch and return created question
        return await get_question_by_id(question_id)

    except Exception as e:
        logger.error(f"Error creating question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create question: {str(e)}")


# Endpoint 3: GET single question by ID
@router.get("/questions/{question_id}", response_model=QuestionResponse)
async def get_question_by_id(question_id: int):
    """Get a single question by ID"""
    db = await get_db()

    try:
        # Get question
        query = "SELECT * FROM questions WHERE id = :question_id"
        question_rows = await db.execute_query(query, {"question_id": question_id})

        if not question_rows:
            raise HTTPException(status_code=404, detail="Question not found")

        question_row = question_rows[0]

        # Get hints
        hints_query = "SELECT * FROM question_hints WHERE question_id = :question_id ORDER BY hint_order"
        hints = await db.execute_query(hints_query, {"question_id": question_id})

        # Get prerequisites
        prereqs_query = "SELECT * FROM question_prerequisites WHERE question_id = :question_id"
        prerequisites = await db.execute_query(prereqs_query, {"question_id": question_id})

        return await deserialize_question_from_db(question_row, hints, prerequisites)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get question: {str(e)}")


# Endpoint 4: PUT update question
@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: int, question_update: QuestionUpdate):
    """Update an existing question"""
    db = await get_db()

    try:
        # Check question exists
        existing_query = "SELECT * FROM questions WHERE id = :question_id"
        existing = await db.execute_query(existing_query, {"question_id": question_id})

        if not existing:
            raise HTTPException(status_code=404, detail="Question not found")

        # Build update query with only provided fields
        update_fields = []
        params = {"question_id": question_id}

        if question_update.type is not None:
            update_fields.append("type = :type")
            params["type"] = question_update.type
        if question_update.text is not None:
            update_fields.append("text = :text")
            params["text"] = question_update.text
        if question_update.difficulty is not None:
            update_fields.append("difficulty = :difficulty")
            params["difficulty"] = question_update.difficulty
        if question_update.band is not None:
            update_fields.append("band = :band")
            params["band"] = question_update.band
        if question_update.tag is not None:
            update_fields.append("tag = :tag")
            params["tag"] = question_update.tag
        if question_update.remark is not None:
            update_fields.append("remark = :remark")
            params["remark"] = question_update.remark
        if question_update.type_specific_data is not None:
            update_fields.append("type_specific_data = :type_specific_data")
            params["type_specific_data"] = json.dumps(question_update.type_specific_data)
        if question_update.solution_standard is not None:
            update_fields.append("solution_standard = :solution_standard")
            params["solution_standard"] = question_update.solution_standard
        if question_update.solution_smart is not None:
            update_fields.append("solution_smart = :solution_smart")
            params["solution_smart"] = question_update.solution_smart
        if question_update.visual_solution is not None:
            update_fields.append("visual_solution = :visual_solution")
            params["visual_solution"] = json.dumps(question_update.visual_solution.model_dump())

        # Always update updated_at
        update_fields.append("updated_at = datetime('now')")

        if update_fields:
            update_query = f"UPDATE questions SET {', '.join(update_fields)} WHERE id = :question_id"
            await db.execute_insert(update_query, params)

        # Update hints (delete old, insert new)
        if question_update.hints is not None:
            await db.execute_insert("DELETE FROM question_hints WHERE question_id = :question_id", {"question_id": question_id})
            for hint in question_update.hints:
                hint_query = """
                INSERT INTO question_hints (question_id, hint_order, level, text, is_interactive, correct_answer)
                VALUES (:question_id, :hint_order, :level, :text, :is_interactive, :correct_answer)
                """
                await db.execute_insert(hint_query, {
                    "question_id": question_id,
                    "hint_order": hint.hint_order,
                    "level": hint.level,
                    "text": hint.text,
                    "is_interactive": hint.is_interactive,
                    "correct_answer": hint.correct_answer
                })

        # Update prerequisites (delete old, insert new)
        if question_update.prerequisites is not None:
            await db.execute_insert("DELETE FROM question_prerequisites WHERE question_id = :question_id", {"question_id": question_id})
            for prereq in question_update.prerequisites:
                prereq_query = """
                INSERT INTO question_prerequisites (question_id, prerequisite_id, prerequisite_name, percentage)
                VALUES (:question_id, :prerequisite_id, :prerequisite_name, :percentage)
                """
                await db.execute_insert(prereq_query, {
                    "question_id": question_id,
                    "prerequisite_id": prereq.prerequisite_id,
                    "prerequisite_name": prereq.prerequisite_name,
                    "percentage": prereq.percentage
                })

        # Return updated question
        return await get_question_by_id(question_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update question: {str(e)}")


# Endpoint 5: DELETE question
@router.delete("/questions/{question_id}")
async def delete_question(question_id: int):
    """Delete a question (cascades to hints and prerequisites)"""
    db = await get_db()

    try:
        # Check question exists
        existing_query = "SELECT * FROM questions WHERE id = :question_id"
        existing = await db.execute_query(existing_query, {"question_id": question_id})

        if not existing:
            raise HTTPException(status_code=404, detail="Question not found")

        # Delete question (CASCADE will delete hints and prerequisites)
        delete_query = "DELETE FROM questions WHERE id = :question_id"
        await db.execute_insert(delete_query, {"question_id": question_id})

        return {"success": True, "message": f"Question {question_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete question: {str(e)}")
