# Claude Code Configuration

## Project: AI-Powered Educational CMS with Template-Based Content Management

### Commands
- **Install Dependencies**: `cd python-services && pip install -r requirements.txt`
- **Start Python Service**: `cd python-services && python run.py`
- **Start Dev Service**: `cd python-services && uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- **Initialize Database**: `psql -d cms_db -f database/schema.sql`
- **Deploy**: `railway up`
- **Test API**: `curl http://localhost:8000/health`

### Project Structure
```
CMS Project 1/
├── python-services/          # Main FastAPI service
│   ├── main.py              # FastAPI application entry point
│   ├── run.py               # Development runner script
│   ├── pdf_extractor.py     # PDF processing and AI categorization
│   ├── database.py          # Database connection and queries
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment configuration template
│   └── models/              # Pydantic models
├── database/
│   └── schema.sql           # PostgreSQL database schema
├── templates/               # HTML template files (future)
│   ├── text-heavy.html
│   ├── visual-grid.html
│   ├── highlight-box.html
│   ├── mixed-media.html
│   └── simple-list.html
└── uploads/
    └── pdfs/                # PDF file storage
```

### Key Features
- AI-powered PDF content extraction and classification
- Hierarchical navigation system (N001, N002, etc.)
- Template-based content fitting (4 content types per node)
- Smart manual + AI assistance workflow
- Preview system with template selection
- Drag-and-drop content categorization
- Railway deployment ready
- PostgreSQL database integration

### Environment Variables
```
DATABASE_URL=postgresql://username:password@localhost:5432/cms_db
OPENAI_API_KEY=sk-...
PORT=8000
UPLOAD_PATH=../uploads
DEBUG=True
LOG_LEVEL=INFO
```

### Database Schema
- chapters: Chapter metadata and organization
- nodes: Individual content nodes with node_id (N001, N002, etc.)
- content_categories: Explanation, Real World Example, Textbook Content, Memory Trick
- extracted_content: Raw PDF content with positioning metadata
- user_assignments: Content-to-category mappings with confidence scores
- template_selections: Template choices per node
- ai_suggestions: AI recommendations with learning data

### Content Processing Pipeline
1. **PDF Upload**: User drops PDF file
2. **Text Extraction**: Python service extracts text with positioning
3. **Node Detection**: Auto-identify node boundaries (N001, N002, etc.)
4. **AI Analysis**: Send each node to AI for content categorization
5. **Template Suggestion**: AI recommends best template based on content
6. **Preview Generation**: Show templated preview to user
7. **Manual Override**: User can reassign content and change templates
8. **Learning Loop**: Store user decisions to improve future suggestions

### Template System
- **Text-Heavy**: Clean typography for explanations
- **Visual Grid**: Multi-column for examples with images
- **Highlight Box**: Emphasis blocks for memory tricks
- **Mixed Media**: Flexible text + image combinations
- **Simple List**: Structured step-by-step content

### AI Integration
- Content classification into 4 categories per node
- Template recommendation based on content analysis
- Confidence scoring for automation decisions
- Learning from user corrections

### Deployment Target
- Platform: Railway
- Database: PostgreSQL addon
- File Storage: Railway built-in storage
- Python Service: Separate Railway deployment
- Domain: Auto-generated or custom

### Development Notes
- Focus on educational content structure with 4-part categorization
- Maintain node hierarchy and relationships (N001, N002, etc.)
- Ensure mathematical notation support in templates
- Optimize preview system for real-time template switching
- Build learning system from user content assignment decisions