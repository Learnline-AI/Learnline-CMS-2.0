#!/bin/bash
# Test script for Question API endpoints
# Make sure the server is running: cd python-services && python3 run.py

BASE_URL="http://localhost:8000/api/questions"
SESSION_ID="test-session-001"
NODE_ID="1"  # Make sure this node exists in your database

echo "========================================="
echo "Testing Question API Endpoints"
echo "========================================="
echo ""

# Test 1: Create MCQ Question
echo "Test 1: Creating MCQ question..."
MCQ_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/session/${SESSION_ID}/node/${NODE_ID}/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": 1,
    "session_id": "test-session-001",
    "type": "mcq",
    "text": "What is 1/2 + 1/4?",
    "difficulty": -2,
    "band": 1,
    "tag": "conceptual",
    "type_specific_data": {
      "options": ["1/6", "1/4", "3/4", "2/6"],
      "correctAnswer": 2
    },
    "solution_standard": "To add fractions, find common denominator. 1/2 = 2/4, so 2/4 + 1/4 = 3/4",
    "hints": [
      {
        "hint_order": 1,
        "level": 1,
        "text": "What is the common denominator?",
        "is_interactive": true,
        "correct_answer": "4"
      }
    ],
    "prerequisites": [
      {
        "prerequisite_id": "prereq1",
        "prerequisite_name": "Understanding Fractions",
        "percentage": 60
      },
      {
        "prerequisite_id": "prereq2",
        "prerequisite_name": "Adding Integers",
        "percentage": 40
      }
    ]
  }')

QUESTION_ID=$(echo $MCQ_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "✓ MCQ question created with ID: $QUESTION_ID"
echo ""

# Test 2: Get Question by ID
echo "Test 2: Getting question by ID..."
curl -s -X GET "${BASE_URL}/questions/${QUESTION_ID}" | python3 -m json.tool
echo "✓ Retrieved question $QUESTION_ID"
echo ""

# Test 3: Create FIB Question
echo "Test 3: Creating FIB question..."
FIB_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/session/${SESSION_ID}/node/${NODE_ID}/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": 1,
    "session_id": "test-session-001",
    "type": "fib",
    "text": "A pizza is cut into 8 slices. If you eat 3 slices, what fraction of the pizza is left? [blank]",
    "difficulty": -2,
    "band": 2,
    "tag": "application",
    "type_specific_data": {
      "fibAnswers": [["5/8", "5 / 8"]]
    },
    "solution_standard": "8 - 3 = 5 slices left. So 5/8 of the pizza remains.",
    "hints": [],
    "prerequisites": []
  }')

FIB_ID=$(echo $FIB_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "✓ FIB question created with ID: $FIB_ID"
echo ""

# Test 4: Get all questions for node (with filtering)
echo "Test 4: Getting all questions for node (band=1)..."
curl -s -X GET "${BASE_URL}/session/${SESSION_ID}/node/${NODE_ID}/questions?band=1" | python3 -m json.tool
echo "✓ Retrieved filtered questions"
echo ""

# Test 5: Update question
echo "Test 5: Updating question difficulty..."
curl -s -X PUT "${BASE_URL}/questions/${QUESTION_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": 0,
    "tag": "analytical"
  }' | python3 -m json.tool
echo "✓ Updated question $QUESTION_ID"
echo ""

# Test 6: Create Graphical Question
echo "Test 6: Creating Graphical question..."
GRAPHICAL_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/session/${SESSION_ID}/node/${NODE_ID}/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": 1,
    "session_id": "test-session-001",
    "type": "graphical",
    "text": "Mark the position of 3.5 on the number line.",
    "difficulty": -2,
    "band": 3,
    "tag": "conceptual",
    "type_specific_data": {
      "graphicalData": {
        "min": 0,
        "max": 10,
        "step": 1,
        "answer": 3.5
      }
    },
    "solution_standard": "3.5 is halfway between 3 and 4.",
    "hints": [],
    "prerequisites": []
  }')

GRAPHICAL_ID=$(echo $GRAPHICAL_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
echo "✓ Graphical question created with ID: $GRAPHICAL_ID"
echo ""

# Test 7: Get all questions (no filter)
echo "Test 7: Getting all questions for node..."
ALL_RESPONSE=$(curl -s -X GET "${BASE_URL}/session/${SESSION_ID}/node/${NODE_ID}/questions")
TOTAL=$(echo $ALL_RESPONSE | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
echo "✓ Total questions in node: $TOTAL"
echo ""

# Test 8: Delete question
echo "Test 8: Deleting FIB question..."
curl -s -X DELETE "${BASE_URL}/questions/${FIB_ID}" | python3 -m json.tool
echo "✓ Deleted question $FIB_ID"
echo ""

# Test 9: Verify deletion
echo "Test 9: Verifying deletion..."
AFTER_DELETE=$(curl -s -X GET "${BASE_URL}/session/${SESSION_ID}/node/${NODE_ID}/questions")
REMAINING=$(echo $AFTER_DELETE | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
echo "✓ Remaining questions: $REMAINING"
echo ""

echo "========================================="
echo "All tests completed!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Created 3 questions (MCQ, FIB, Graphical)"
echo "- Retrieved questions by ID"
echo "- Retrieved questions with filtering"
echo "- Updated question"
echo "- Deleted question"
echo ""
echo "Remaining question IDs: $QUESTION_ID, $GRAPHICAL_ID"
