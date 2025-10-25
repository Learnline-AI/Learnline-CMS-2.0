# AI-Powered Educational CMS Frontend

A modern web interface for the Educational Content Management System that integrates with the FastAPI backend to provide AI-powered PDF content extraction and categorization.

## Features

- **🎯 PDF Upload Interface**: Drag-and-drop PDF upload with real-time progress
- **🤖 AI Content Categorization**: Automatic extraction into 4 educational categories:
  - Explanation
  - Real World Example
  - Textbook Content
  - Memory Trick
- **📱 Template System**: 5 different educational templates:
  - Text-Heavy: Clean typography for explanations
  - Visual Grid: Multi-column layout for examples
  - Highlight Box: Emphasis blocks for memory tricks
  - Mixed Media: Flexible text + image combinations
  - Simple List: Structured step-by-step content
- **⚡ Live Preview**: Real-time template switching and preview
- **🎨 Learnline Design Language**: Consistent with educational UI patterns

## Quick Start

### 1. Prerequisites
- FastAPI backend running on `http://localhost:8000`
- Python 3.9+ with HTTP server capabilities

### 2. Start the Frontend
```bash
cd frontend/public
python3 -m http.server 3001
```

### 3. Access the Interface
Open your browser and navigate to:
```
http://localhost:3001
```

## Project Structure

```
frontend/
├── public/
│   ├── index.html          # Main application layout
│   ├── styles.css          # Learnline design system styles
│   ├── app.js             # Core application logic
│   └── README.md          # This file
└── README.md              # This file
```

## Usage Workflow

1. **Upload PDF**: Drag and drop a PDF file or click to browse
2. **Processing**: The AI automatically extracts and categorizes content into nodes
3. **Review Results**: See categorized content with confidence scores
4. **Preview Templates**: Switch between different educational templates
5. **Save & Export**: Finalize your content structure

## API Integration

The frontend communicates with the FastAPI backend through these endpoints:
- `POST /upload-pdf` - Upload and process PDF files
- `GET /nodes/{chapter_id}` - Retrieve processed nodes
- `POST /categorize-content` - Re-categorize content
- `POST /suggest-template` - Get template suggestions

## Design System

Built using the Learnline design language featuring:
- **Colors**: Primary blue (#007bff), background gray (#F8F9FA)
- **Typography**: Avenir Next LT Pro with hierarchical sizing
- **Components**: Card-based layouts with rounded corners and subtle shadows
- **Interactions**: Smooth animations and hover states
- **Responsive**: Mobile-friendly breakpoints and layouts

## Configuration

The frontend automatically connects to:
- Backend API: `http://localhost:8000`
- Frontend Server: `http://localhost:3001`

To change the backend URL, edit the `apiBaseUrl` in `app.js`:
```javascript
this.apiBaseUrl = 'your-backend-url';
```

## Development Notes

- Built with vanilla JavaScript for simplicity and performance
- Uses modern ES6+ features and async/await patterns
- Implements progressive enhancement for accessibility
- Follows educational UX patterns for intuitive content management

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Next Steps

For production deployment:
1. Use a proper web server (nginx, Apache)
2. Enable HTTPS
3. Configure proper CORS settings
4. Implement authentication if needed
5. Add error logging and monitoring