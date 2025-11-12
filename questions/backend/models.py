"""
Pydantic models for Question API request/response validation.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from questions.backend.schemas import QuestionType, Tag, validate_question_type_data


class HintModel(BaseModel):
    """Model for a single hint"""
    id: Optional[str] = None
    hint_order: int = Field(..., ge=1)
    level: int = Field(..., ge=1)
    text: str
    is_interactive: bool = False
    correct_answer: Optional[str] = None


class PrerequisiteModel(BaseModel):
    """Model for a single prerequisite"""
    prerequisite_id: str
    prerequisite_name: str
    percentage: int = Field(..., ge=0, le=100)


class VisualSolutionStep(BaseModel):
    """Model for a visual solution step (used in visual-mcq)"""
    id: str
    text: str
    content: str


class VisualSolution(BaseModel):
    """Model for visual solutions with standard and smart variants"""
    standard: List[VisualSolutionStep] = []
    smart: Optional[List[VisualSolutionStep]] = None


class QuestionBase(BaseModel):
    """Base question fields common to all types"""
    type: QuestionType
    text: str
    difficulty: float = Field(default=0, ge=-3, le=3)
    band: int = Field(default=1, ge=1, le=5)
    tag: Tag = Tag.EMPTY
    remark: Optional[str] = None

    # Type-specific data (JSON)
    type_specific_data: Optional[Dict[str, Any]] = None

    # Solutions
    solution_standard: Optional[str] = None
    solution_smart: Optional[str] = None

    # Visual solution (for visual-mcq)
    visual_solution: Optional[VisualSolution] = None

    # Nested data
    hints: List[HintModel] = []
    prerequisites: List[PrerequisiteModel] = []

    @field_validator('prerequisites')
    @classmethod
    def validate_prerequisites_sum(cls, v: List[PrerequisiteModel]) -> List[PrerequisiteModel]:
        """Ensure prerequisites sum to 100% (with tolerance for rounding)"""
        if v:
            total = sum(prereq.percentage for prereq in v)
            if total != 100 and total != 0:  # Allow 0 for empty list
                # Allow small rounding errors
                if abs(total - 100) > 2:
                    raise ValueError(f"Prerequisites must sum to 100%, got {total}%")
        return v

    @field_validator('type_specific_data')
    @classmethod
    def validate_type_specific_data(cls, v: Optional[Dict[str, Any]], info) -> Optional[Dict[str, Any]]:
        """Validate type-specific data matches question type requirements"""
        if 'type' not in info.data:
            return v

        question_type = info.data['type']
        if not validate_question_type_data(question_type, v):
            raise ValueError(f"Invalid type_specific_data for question type {question_type}")
        return v


class QuestionCreate(QuestionBase):
    """Model for creating a new question (no ID)"""
    node_id: int
    session_id: str


class QuestionUpdate(QuestionBase):
    """Model for updating an existing question (all fields optional)"""
    type: Optional[QuestionType] = None
    text: Optional[str] = None
    difficulty: Optional[float] = Field(default=None, ge=-3, le=3)
    band: Optional[int] = Field(default=None, ge=1, le=5)
    tag: Optional[Tag] = None


class QuestionResponse(QuestionBase):
    """Model for question response (includes ID and timestamps)"""
    id: int
    node_id: int
    session_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuestionListResponse(BaseModel):
    """Model for list of questions response"""
    questions: List[QuestionResponse]
    total: int
    filtered: int
