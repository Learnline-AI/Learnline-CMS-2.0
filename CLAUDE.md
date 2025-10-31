# Claude Code Configuration

## Project: LearnLine AI Educational CMS

### System Overview
AI-powered educational CMS for creating adaptive K-12 math lessons with:
- 11 educational component types with drag-and-drop interface
- CSV-driven knowledge graphs (LEADS_TO, PREREQUISITE, ENRICHMENT relationships)
- Vision AI PDF processing for automatic component extraction
- Session-based persistence with SQLite storage
- Responsive student preview system

### Commands
- **Start Dev Service**: `cd python-services && uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- **Initialize Database**: Database auto-initializes with schema from `database/sqlite_schema.sql`
- **Test API**: `curl http://localhost:8000/health`
- **Access CMS**: `http://localhost:8000` (serves `frontend/public/index.html`)

### Architecture Reality (Based on Code Analysis)
```
LearnLine CMS/
├── python-services/              # FastAPI backend (main.py, vision_processor.py, database.py)
│   ├── component_schemas.py      # 11 component definitions with validation
│   ├── vision_processor.py       # OpenAI GPT-4O vision AI with 590-line system prompt
│   ├── database.py              # SQLite with async operations, transaction safety
│   └── main.py                  # API endpoints for sessions, components, CSV import
├── frontend/public/             # Vanilla JS frontend (NOT React/TypeScript)
│   ├── app.js                   # Main CMS editor (~5000 lines)
│   ├── student-view.js          # Component rendering for learners
│   └── index.html               # Single-page application
├── database/
│   └── sqlite_schema.sql        # Database schema (NOT PostgreSQL)
└── uploads/pdfs/                # PDF storage for vision processing
```

### 11 Educational Component Types
**Text Components**: heading, paragraph, definition (term+definition), memory-trick
**Visual Components**: four-pictures, three-pictures, two-pictures, three-svgs
**Interactive Components**: step-sequence (array), worked-example (problem+solution+answer)
**Display Components**: callout-box (text+style), hero-number (visual_type+chart_data+caption)

### Component Integration Pattern (9 Steps Minimum)
1. **Schema Definition** (`component_schemas.py`) - Parameters, validation, examples
2. **AI Training** (`vision_processor.py`) - Guidelines in 590-line system prompt
3. **Editor UI** (`app.js` createComponentElement) - Form controls and dropdowns
4. **Preview Generation** (`app.js` generatePreviewHTML) - Live preview rendering
5. **Data Extraction** (`app.js` extractComponentData) - Form → JSON conversion
6. **Population Logic** (`app.js` populateComponentInputs) - AI → Form population
7. **Student Rendering** (`student-view.js`) - Student-facing component display
8. **CSS Styling** (`styles.css` + `student-view.css`) - Editor and student styles
9. **UI Button** (`index.html`) - Drag-and-drop component panel entry

### Knowledge Graph System
**CSV-Driven (Not Neo4j)**:
- Import from 3 CSV files: `node-export.csv`, `relationship-export.csv`, `graph-export.csv`
- Node types: core (N003), support (S001), enrichment (E001)
- Relationships: LEADS_TO, PREREQUISITE_FOR, PREREQUISITE with explanations
- Storage: SQLite `session_relationships` table with session scoping
- Visualization: Canvas-based network with zoom/pan, manual positioning

### Session Management
**Permanent Sessions (Not 36-hour expiry)**:
- Created with 100-year expiry via `DatabaseManager.create_session()`
- Auto-save functionality with `scheduleAutoSave()` method
- Transaction-safe operations via `transaction_context()`
- Session-scoped nodes and relationships in SQLite
- Default starter nodes (N001, N002) auto-created

### Vision AI Pipeline
**OpenAI GPT-4O Integration**:
- 590-line system prompt with detailed component selection guidelines
- Progressive quality degradation and retry logic (4 attempts)
- Batch processing for multi-page PDFs with memory management
- Component validation against schemas before database storage
- Template suggestion (text-heavy, visual-grid, highlight-box, mixed-media, simple-list)

### Database Schema (SQLite)
- `sessions`: Permanent user sessions with 100-year expiry
- `nodes`: Session-scoped content nodes with `node_id` + `session_id`
- `node_components`: Component sequences with JSON parameters
- `session_relationships`: Knowledge graph relationships per session
- `content_categories`: 4 content types (Explanation, Real World Example, Textbook Content, Memory Trick)

### API Patterns
**FastAPI with Session-Based Endpoints**:
- Session management: `/session/create`, `/session/validate/{session_id}`
- Node operations: `/session/{session_id}/nodes`, `/session/{session_id}/nodes/{node_id}/content`
- Component sequences: `/nodes/{node_id}/components` (CRUD operations)
- CSV import: `/session/{session_id}/relationships/bulk`
- PDF processing: `/upload-pdf` with progress callbacks

### Development Patterns
1. **Component Creation**: Follow 9-step pattern exactly, validate each step
2. **Vision AI Integration**: Use existing 590-line prompt structure for consistency
3. **Database Operations**: Always use transaction context for multi-operation sequences
4. **CSV Import**: Parse → Session nodes → Relationships → Visual network update
5. **Error Handling**: Graceful degradation, continue processing on partial failures

### Environment Variables
```
OPENAI_API_KEY=sk-...           # Vision AI processing
ANTHROPIC_API_KEY=sk-...        # Claude chat features
DATABASE_URL=sqlite:///cms_development.db  # SQLite database
PORT=8000                       # Server port
```

### Critical Integration Points
- **Component Validation**: `validate_component_parameters()` before database storage
- **Session Persistence**: All operations must include session_id for scoping
- **Vision AI Consistency**: Maintain 590-line system prompt structure for component extraction
- **CSV Knowledge Graph**: Parse CSVs → Create session nodes → Build relationships → Update visual network
- **Auto-save Safety**: Use transaction context for atomic operations

### Testing Strategy
- **Component Integration**: Test all 9 steps (schema → UI → database → student view)
- **Vision AI Pipeline**: Test PDF → component extraction → validation → storage
- **CSV Import**: Test node creation → relationship building → visual network update
- **Session Management**: Test persistence, recovery, transaction safety

This configuration reflects the actual implemented system based on comprehensive code analysis.