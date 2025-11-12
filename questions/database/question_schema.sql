-- Question System Database Schema
-- 3 tables: questions, question_hints, question_prerequisites
-- Integrates with existing CMS tables (nodes, sessions)

-- Main questions table
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('mcq', 'fib', 'spot-error', 'tita', 'graphical', 'visual-mcq', 'match-svg', 'other')),
    text TEXT NOT NULL,
    difficulty REAL NOT NULL DEFAULT 0 CHECK(difficulty >= -3 AND difficulty <= 3),
    band INTEGER NOT NULL DEFAULT 1 CHECK(band >= 1 AND band <= 5),
    tag TEXT CHECK(tag IN ('conceptual', 'analytical', 'application', 'computational', '')),
    remark TEXT,

    -- Type-specific data stored as JSON
    -- MCQ: {"options": ["A", "B", "C", "D"], "correctAnswer": 0}
    -- FIB: {"fibAnswers": [["ans1", "ans2"], ["ans3"]]}
    -- TITA: {"titaAnswers": ["150 km", "150km"]}
    -- Graphical: {"graphicalData": {"min": 0, "max": 10, "step": 1, "answer": 3.5}}
    -- Visual-MCQ: {"visualOptions": [{"id": "vo1", "content": "<svg>..."}, ...], "questionVisuals": [...], "correctAnswer": 0}
    -- Spot-Error: {"solutionWithMistake": "...", "spotError": {"text": "...", "startIndex": 10, "endIndex": 20}}
    -- Match-SVG: {"matchLeftItems": [...], "matchRightItems": [...], "correctMatches": [...]}
    type_specific_data TEXT,

    -- Solutions
    solution_standard TEXT,
    solution_smart TEXT,

    -- Visual solution steps (JSON array for visual-mcq)
    -- {"standard": [{"id": "step1", "text": "...", "content": "<svg>..."}], "smart": [...]}
    visual_solution TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys to existing CMS tables
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Hints table (supports multiple hints per question)
CREATE TABLE IF NOT EXISTS question_hints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    hint_order INTEGER NOT NULL,
    level INTEGER NOT NULL,
    text TEXT NOT NULL,
    is_interactive BOOLEAN DEFAULT 0,
    correct_answer TEXT,

    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(question_id, hint_order)
);

-- Prerequisites table (supports multiple prerequisites with percentages)
CREATE TABLE IF NOT EXISTS question_prerequisites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    prerequisite_id TEXT NOT NULL,
    prerequisite_name TEXT NOT NULL,
    percentage INTEGER NOT NULL CHECK(percentage >= 0 AND percentage <= 100),

    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(question_id, prerequisite_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_node_id ON questions(node_id);
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_band ON questions(band);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_hints_question_id ON question_hints(question_id);
CREATE INDEX IF NOT EXISTS idx_question_prerequisites_question_id ON question_prerequisites(question_id);
