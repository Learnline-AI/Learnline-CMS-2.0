# Component Integration Patterns Skill

## Auto-Activation Triggers
- "component", "add component", "new component"
- "drag", "drop", "drag-and-drop"
- Any of the 11 component type names
- "createComponentElement", "extractComponentData", "populateComponentInputs"
- "schema", "validation", "parameter"

## Core Patterns

### 11 Component Types (Must Know All)
**Text Components**:
- `heading` - Single text input for titles/section headers
- `paragraph` - Large text area for explanations and body content
- `definition` - Term + definition fields for key concepts
- `memory-trick` - Single text for mnemonics/memory aids

**Visual Components**:
- `four-pictures` - 4 image slots with title/description each
- `three-pictures` - 3 image slots with title/description each
- `two-pictures` - 2 image slots with title/description each
- `three-svgs` - 3 AI-generated SVG illustrations with titles and descriptions

**Interactive Components**:
- `step-sequence` - Numbered list for procedures/processes (array of strings)
- `worked-example` - Problem + solution + answer structure for examples

**Display Components**:
- `callout-box` - Highlighted box for important information (text + style)
- `hero-number` - Large centered visual element with chart data and caption

### The 9-Step Integration Pattern (CRITICAL)
Never skip steps. Each component MUST follow this exact pattern:

#### 1. Schema Definition (`component_schemas.py`)
```python
"your-component": {
    "description": "What it does",
    "parameters": {
        "text": {"type": "string", "required": True, "description": "Main content"},
        "style": {"type": "string", "required": False, "description": "Variant type"}
    },
    "example": {
        "type": "your-component",
        "parameters": {"text": "Example text", "style": "default"}
    }
}
```
⚠️ **Never use "type" as parameter name!**

#### 2. AI Training (`vision_processor.py` line 70-591)
Add component guidelines to 590-line system prompt:
- When to use component (line ~70)
- Example usage with correct parameters (line ~116)

#### 3. Editor UI (`app.js` createComponentElement)
Add case in `createComponentElement()` after line 524:
```javascript
case 'your-component':
    div.innerHTML = `
        <div class="component-header">
            <h4>Your Component</h4>
            <button class="remove-component">×</button>
        </div>
        <select class="your-style component-select">
            <option value="default">Default</option>
        </select>
        <div contenteditable="true" class="component-input component-textarea"></div>
    `;
    break;
```

#### 4. Preview Generation (`app.js` generatePreviewHTML)
Add case in `generatePreviewHTML()` after line 1247:
```javascript
case 'your-component':
    const text = component.querySelector('.component-input')?.innerHTML || 'Text';
    const style = component.querySelector('.your-style')?.value || 'default';
    return `
        <div class="preview-your-component preview-your-${style}">
            ${this.formatTextForPreview(text)}
        </div>
    `;
```

#### 5. Data Extraction (`app.js` extractComponentData)
Add case in `extractComponentData()` after line 1576:
```javascript
case 'your-component':
    data.text = component.querySelector('.component-input')?.innerHTML || '';
    data.style = component.querySelector('.your-style')?.value || 'default';
    break;
```

#### 6. Population Logic (`app.js` populateComponentInputs) ⚠️ CRITICAL
Add case in `populateComponentInputs()` after line 934:
```javascript
case 'your-component':
    if (data.text) {
        const input = componentElement.querySelector('.component-input');
        if (input) input.innerHTML = data.text;
    }
    if (data.style) {
        const dropdown = componentElement.querySelector('.your-style');
        if (dropdown) dropdown.value = data.style;
    }
    break;
```
**If AI component is empty = you forgot Step 6!**

#### 7. Student Rendering (`student-view.js`)
Add case after line 99:
```javascript
case 'your-component':
    return this.renderYourComponent(params);
```
Add method after line 181:
```javascript
renderYourComponent(params) {
    const text = params.text || 'Text';
    const style = params.style || 'default';
    return `
        <div class="student-your-component student-your-${style}">
            ${text}
        </div>
    `;
}
```

#### 8. CSS Styling (2 files required)
**`styles.css`** (after line 2028):
```css
.preview-your-component {
    padding: 15px;
    margin: 15px 0;
    border-radius: 8px;
    background: #f5f5f5;
}
```

**`student-view.css`** (after line 340):
```css
.student-your-component {
    padding: 20px;
    margin: 20px 0;
    border-radius: 8px;
    background: #f5f5f5;
}
```

#### 9. UI Button (`index.html`)
Add after line 113 (in Learning Components):
```html
<div class="component-item" draggable="true" data-component-type="your-component">
    <i class="fas fa-star"></i>
    <span>Your Component</span>
</div>
```

Add after line 143 (hidden buttons):
```html
<button id="api-add-your-component" onclick="insertComponent('your-component')">Add Your Component</button>
```

### Component Validation Patterns
Always validate using `validate_component_parameters()` from `component_schemas.py`:
```python
is_valid, error_msg = validate_component_parameters(component_type, parameters)
```

### Testing Requirements
**MUST test BOTH flows**:
1. **Manual**: Click button → type text → preview updates → save → reload → still there
2. **AI**: Upload PDF → AI creates component → component has text (not empty!) → preview shows it

### Common Integration Failures
- **Step 6 Missing**: AI components appear empty in editor
- **CSS Missing**: Components look broken in preview/student view
- **Parameter Mismatch**: Schema validation fails
- **Event Binding**: Dropdowns don't trigger auto-save
- **Student View Missing**: Components don't render for students

### Architecture Rules
1. **Never modify existing components** - only ADD new ones
2. **Always use transaction context** for database operations
3. **Validate parameters** before database storage
4. **Follow naming conventions**: kebab-case for types, camelCase for methods
5. **Include confidence scoring** for AI-generated components

## Files Modified Per Component (Report This)
1. `component_schemas.py` (schema definition)
2. `vision_processor.py` (AI training)
3. `app.js` (editor UI, preview, extraction, population)
4. `student-view.js` (student rendering)
5. `index.html` (UI buttons)
6. `styles.css` (editor styling)
7. `student-view.css` (student styling)

**Total: 7 files, ~100 lines added per component**

## Integration with Vision AI
The 590-line system prompt in `vision_processor.py` contains detailed guidelines for each component type. When adding new components, you MUST update the prompt with:
- When to use the component
- Parameter specifications
- Example JSON output
- Decision tree logic for component selection

This maintains consistency in AI component extraction from PDFs.