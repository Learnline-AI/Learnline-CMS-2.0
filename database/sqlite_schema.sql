-- SQLite Schema for Educational CMS
-- Simplified version for development
--
-- NOTE: Question system tables are defined in questions/database/question_schema.sql

-- Sessions table - Track user work sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    session_data TEXT DEFAULT '{}'
);

-- Content categories - The 4 main content types
CREATE TABLE IF NOT EXISTS content_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert the 4 standard content categories
INSERT OR IGNORE INTO content_categories (name, description) VALUES
('Explanation', 'Core conceptual explanations and theory'),
('Real World Example', 'Practical applications and real-world scenarios'),
('Textbook Content', 'Formal academic content, definitions, and formulas'),
('Memory Trick', 'Mnemonics, tips, and shortcuts for remembering');

-- Chapters table - Main content organization
CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    pdf_filename TEXT,
    pdf_path TEXT,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    status TEXT DEFAULT 'draft'
);

-- Nodes table - Individual content sections (N001, N002, etc.)
CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY,
    node_id TEXT NOT NULL,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    title TEXT,
    raw_content TEXT NOT NULL,
    page_number INTEGER,
    position_data TEXT,
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, node_id)
);

-- User assignments - Content-to-category mappings
CREATE TABLE IF NOT EXISTS user_assignments (
    id INTEGER PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES content_categories(id),
    content_text TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.0,
    is_ai_suggested INTEGER DEFAULT 0,
    is_user_confirmed INTEGER DEFAULT 0,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by TEXT
);

-- Template selections - Template choices per node
CREATE TABLE IF NOT EXISTS template_selections (
    id INTEGER PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.0,
    is_ai_suggested INTEGER DEFAULT 0,
    is_user_selected INTEGER DEFAULT 0,
    reasoning TEXT,
    selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    selected_by TEXT
);

-- Node Components table - Store component sequences with parameters
CREATE TABLE IF NOT EXISTS node_components (
    id INTEGER PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    component_type TEXT NOT NULL,
    component_order INTEGER NOT NULL,
    parameters TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- Session Relationships table - Track node connections within sessions
CREATE TABLE IF NOT EXISTS session_relationships (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    from_node_id TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL DEFAULT 'LEADS_TO',
    explanation TEXT DEFAULT '',
    created_by TEXT DEFAULT 'CSV_IMPORT',
    confidence_score REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, from_node_id, to_node_id, relationship_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_nodes_session_id ON nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_nodes_node_id ON nodes(node_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_node_id ON user_assignments(node_id);
CREATE INDEX IF NOT EXISTS idx_template_selections_node_id ON template_selections(node_id);
CREATE INDEX IF NOT EXISTS idx_node_components_node_id ON node_components(node_id);
CREATE INDEX IF NOT EXISTS idx_session_relationships_session_id ON session_relationships(session_id);
CREATE INDEX IF NOT EXISTS idx_session_relationships_from_node ON session_relationships(from_node_id);
CREATE INDEX IF NOT EXISTS idx_session_relationships_to_node ON session_relationships(to_node_id);