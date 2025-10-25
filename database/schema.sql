-- Educational CMS Database Schema
-- PostgreSQL Schema for AI-powered Content Management System

-- Chapters table - Main content organization
CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    pdf_filename VARCHAR(255),
    pdf_path VARCHAR(500),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft'
);

-- Content categories - The 4 main content types
CREATE TABLE content_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the 4 standard content categories
INSERT INTO content_categories (name, description) VALUES
('Explanation', 'Core conceptual explanations and theory'),
('Real World Example', 'Practical applications and real-world scenarios'),
('Textbook Content', 'Formal academic content, definitions, and formulas'),
('Memory Trick', 'Mnemonics, tips, and shortcuts for remembering');

-- Sessions table - Track user work sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL DEFAULT 'anonymous',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    session_data JSONB DEFAULT '{}'
);

-- Nodes table - Individual content sections (N001, N002, etc.)
CREATE TABLE nodes (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(20) NOT NULL,
    chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
    title VARCHAR(255),
    raw_content TEXT NOT NULL,
    page_number INTEGER,
    position_data JSONB,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, node_id)
);

-- Extracted content - Raw PDF content with positioning
CREATE TABLE extracted_content (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    line_number INTEGER,
    position_x FLOAT,
    position_y FLOAT,
    font_size FLOAT,
    font_family VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User assignments - Content-to-category mappings
CREATE TABLE user_assignments (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES content_categories(id),
    content_text TEXT NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    is_ai_suggested BOOLEAN DEFAULT FALSE,
    is_user_confirmed BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(100)
);

-- Template selections - Template choices per node
CREATE TABLE template_selections (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    is_ai_suggested BOOLEAN DEFAULT FALSE,
    is_user_selected BOOLEAN DEFAULT FALSE,
    reasoning TEXT,
    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    selected_by VARCHAR(100)
);

-- AI suggestions - AI recommendations with learning data
CREATE TABLE ai_suggestions (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL, -- 'category' or 'template'
    suggested_value VARCHAR(100) NOT NULL,
    confidence_score FLOAT NOT NULL,
    reasoning TEXT,
    user_feedback VARCHAR(20), -- 'accepted', 'rejected', 'modified'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feedback_at TIMESTAMP
);

-- Templates table - Available templates
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    html_template TEXT,
    css_styles TEXT,
    use_cases TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT INTO templates (name, display_name, description, use_cases) VALUES
('text-heavy', 'Text-Heavy', 'Clean typography focused layout for explanations and definitions', 'Explanations, Textbook Content'),
('visual-grid', 'Visual Grid', 'Multi-column layout optimized for examples with images', 'Real World Examples, Mixed content'),
('highlight-box', 'Highlight Box', 'Emphasis blocks and callouts for important information', 'Memory Tricks, Key concepts'),
('mixed-media', 'Mixed Media', 'Flexible layout combining text, images, and other media', 'Complex content, Multi-category nodes'),
('simple-list', 'Simple List', 'Structured step-by-step or bulleted content layout', 'Procedures, Step-by-step content');

-- Highlight box data - Specific data for highlight box templates
CREATE TABLE highlight_box_data (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT '',
    formatted_text TEXT NOT NULL,
    image_url VARCHAR(500),
    image_filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

-- Node relationships - For linking related nodes
CREATE TABLE node_relationships (
    id SERIAL PRIMARY KEY,
    parent_node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    child_node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- 'prerequisite', 'follows', 'related'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_node_id, child_node_id, relationship_type)
);

-- Learning analytics - Track user interactions for improvement
CREATE TABLE learning_analytics (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    user_action VARCHAR(100) NOT NULL,
    action_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(100),
    session_id VARCHAR(100)
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_nodes_session_id ON nodes(session_id);
CREATE INDEX idx_nodes_chapter_id ON nodes(chapter_id);
CREATE INDEX idx_nodes_node_id ON nodes(node_id);
CREATE INDEX idx_extracted_content_node_id ON extracted_content(node_id);
CREATE INDEX idx_user_assignments_node_id ON user_assignments(node_id);
CREATE INDEX idx_user_assignments_category_id ON user_assignments(category_id);
CREATE INDEX idx_template_selections_node_id ON template_selections(node_id);
CREATE INDEX idx_ai_suggestions_node_id ON ai_suggestions(node_id);
CREATE INDEX idx_highlight_box_data_node_id ON highlight_box_data(node_id);
CREATE INDEX idx_learning_analytics_node_id ON learning_analytics(node_id);
CREATE INDEX idx_learning_analytics_timestamp ON learning_analytics(timestamp);

-- Update trigger for last_modified
CREATE OR REPLACE FUNCTION update_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chapters_last_modified
    BEFORE UPDATE ON chapters
    FOR EACH ROW
    EXECUTE FUNCTION update_last_modified();

CREATE TRIGGER update_nodes_last_modified
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_last_modified();

CREATE TRIGGER update_highlight_box_data_last_modified
    BEFORE UPDATE ON highlight_box_data
    FOR EACH ROW
    EXECUTE FUNCTION update_last_modified();

-- Node Components table - Store component sequences with parameters
CREATE TABLE node_components (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL,
    component_order INTEGER NOT NULL,
    parameters JSONB NOT NULL,
    confidence_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- Create indexes for node_components performance
CREATE INDEX idx_node_components_node_id ON node_components(node_id);
CREATE INDEX idx_node_components_order ON node_components(node_id, component_order);
CREATE INDEX idx_node_components_type ON node_components(component_type);

-- Add trigger for node_components last_modified
CREATE TRIGGER update_node_components_last_modified
    BEFORE UPDATE ON node_components
    FOR EACH ROW
    EXECUTE FUNCTION update_last_modified();