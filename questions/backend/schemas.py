"""
Type definitions and validation schemas for all 8 question types.
Defines the structure and rules for each question type's specific data.
"""

from typing import Dict, List, Any, Optional
from enum import Enum


class QuestionType(str, Enum):
    """All supported question types"""
    MCQ = "mcq"
    FIB = "fib"
    SPOT_ERROR = "spot-error"
    TITA = "tita"
    GRAPHICAL = "graphical"
    VISUAL_MCQ = "visual-mcq"
    MATCH_SVG = "match-svg"
    OTHER = "other"


class Tag(str, Enum):
    """Content tags for questions"""
    CONCEPTUAL = "conceptual"
    ANALYTICAL = "analytical"
    APPLICATION = "application"
    COMPUTATIONAL = "computational"
    EMPTY = ""


# Type-specific schemas

def validate_mcq_data(data: Dict[str, Any]) -> bool:
    """
    MCQ requires:
    - options: array of exactly 4 strings
    - correctAnswer: integer 0-3
    """
    if not data:
        return False
    if "options" not in data or "correctAnswer" not in data:
        return False
    if not isinstance(data["options"], list) or len(data["options"]) != 4:
        return False
    if not isinstance(data["correctAnswer"], int) or data["correctAnswer"] not in [0, 1, 2, 3]:
        return False
    return True


def validate_fib_data(data: Dict[str, Any]) -> bool:
    """
    FIB requires:
    - fibAnswers: array of arrays (one per blank, each containing possible answers)
    Example: [["ans1", "ans2"], ["ans3"]] means 2 blanks, first accepts 2 answers, second accepts 1
    """
    if not data:
        return False
    if "fibAnswers" not in data:
        return False
    if not isinstance(data["fibAnswers"], list):
        return False
    for blank_answers in data["fibAnswers"]:
        if not isinstance(blank_answers, list) or len(blank_answers) == 0:
            return False
    return True


def validate_spot_error_data(data: Dict[str, Any]) -> bool:
    """
    Spot-Error requires:
    - solutionWithMistake: text with the mistake
    - spotError: {text: string, startIndex: int, endIndex: int}
    """
    if not data:
        return False
    if "solutionWithMistake" not in data:
        return False
    if "spotError" in data:
        error = data["spotError"]
        if not isinstance(error, dict):
            return False
        if "text" not in error or "startIndex" not in error or "endIndex" not in error:
            return False
    return True


def validate_tita_data(data: Dict[str, Any]) -> bool:
    """
    TITA requires:
    - titaAnswers: array of acceptable answer strings
    Example: ["150 km", "150km"]
    """
    if not data:
        return False
    if "titaAnswers" not in data:
        return False
    if not isinstance(data["titaAnswers"], list) or len(data["titaAnswers"]) == 0:
        return False
    return True


def validate_graphical_data(data: Dict[str, Any]) -> bool:
    """
    Graphical requires:
    - graphicalData: {min: number, max: number, step: number, answer: number}
    """
    if not data:
        return False
    if "graphicalData" not in data:
        return False
    gd = data["graphicalData"]
    if not isinstance(gd, dict):
        return False
    required_keys = ["min", "max", "step", "answer"]
    if not all(key in gd for key in required_keys):
        return False
    return True


def validate_visual_mcq_data(data: Dict[str, Any]) -> bool:
    """
    Visual-MCQ requires:
    - visualOptions: array of {id: string, content: string} (exactly 4)
    - correctAnswer: integer 0-3
    - questionVisuals: array of {id: string, content: string} (optional)
    """
    if not data:
        return False
    if "visualOptions" not in data or "correctAnswer" not in data:
        return False
    if not isinstance(data["visualOptions"], list) or len(data["visualOptions"]) != 4:
        return False
    if not isinstance(data["correctAnswer"], int) or data["correctAnswer"] not in [0, 1, 2, 3]:
        return False
    for option in data["visualOptions"]:
        if "id" not in option or "content" not in option:
            return False
    return True


def validate_match_svg_data(data: Dict[str, Any]) -> bool:
    """
    Match-SVG requires:
    - matchLeftItems: array of {id: string, content: string}
    - matchRightItems: array of {id: string, content: string}
    - correctMatches: array of {leftId: string, rightId: string}
    """
    if not data:
        return False
    required_keys = ["matchLeftItems", "matchRightItems", "correctMatches"]
    if not all(key in data for key in required_keys):
        return False

    for item in data["matchLeftItems"]:
        if "id" not in item or "content" not in item:
            return False
    for item in data["matchRightItems"]:
        if "id" not in item or "content" not in item:
            return False
    for match in data["correctMatches"]:
        if "leftId" not in match or "rightId" not in match:
            return False
    return True


def validate_other_data(data: Dict[str, Any]) -> bool:
    """Other type has no specific validation"""
    return True


# Validator mapping
QUESTION_TYPE_VALIDATORS = {
    QuestionType.MCQ: validate_mcq_data,
    QuestionType.FIB: validate_fib_data,
    QuestionType.SPOT_ERROR: validate_spot_error_data,
    QuestionType.TITA: validate_tita_data,
    QuestionType.GRAPHICAL: validate_graphical_data,
    QuestionType.VISUAL_MCQ: validate_visual_mcq_data,
    QuestionType.MATCH_SVG: validate_match_svg_data,
    QuestionType.OTHER: validate_other_data,
}


def validate_question_type_data(question_type: str, data: Optional[Dict[str, Any]]) -> bool:
    """
    Validate type-specific data for a given question type.
    Returns True if valid, False otherwise.
    """
    if question_type not in QUESTION_TYPE_VALIDATORS:
        return False

    validator = QUESTION_TYPE_VALIDATORS[question_type]
    return validator(data or {})
