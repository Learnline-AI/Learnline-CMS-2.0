# Component Integration Template

**Component Type**: [e.g., text-highlighter, interactive-quiz, visual-comparison]
**Task ID**: [UUID - auto-generated]
**Created**: [Date]
**Status**: Planning | In Progress | Testing | Complete

## Component Overview

### Component Purpose
- **Description**: [What this component does]
- **Category**: [ ] Text [ ] Visual [ ] Interactive [ ] Display
- **Educational Use Case**: [When students/teachers would use this]
- **Existing Components**: [Similar components already in system]

### Design Specifications
- **Required Parameters**: [List parameters with types and descriptions]
- **Optional Parameters**: [List optional parameters]
- **Validation Rules**: [Parameter validation requirements]
- **Example Usage**: [JSON example of component parameters]

## 9-Step Integration Progress

### ✅ Step 1: Schema Definition (`component_schemas.py`)
- [ ] Added to `COMPONENT_SCHEMAS` dictionary
- [ ] Description provided
- [ ] Parameters defined with types and requirements
- [ ] Example JSON structure included
- [ ] Validation logic works with `validate_component_parameters()`

**Implementation Notes**:
```python
"your-component": {
    "description": "Component description",
    "parameters": {
        "text": {"type": "string", "required": True, "description": "Main content"},
        "style": {"type": "string", "required": False, "description": "Variant type"}
    },
    "example": {
        "type": "your-component",
        "parameters": {"text": "Example", "style": "default"}
    }
}
```

### ✅ Step 2: AI Training (`vision_processor.py` lines 70-591)
- [ ] Guidelines added to 590-line system prompt
- [ ] When-to-use criteria specified (line ~70-120)
- [ ] Parameter examples included (line ~116+)
- [ ] Decision tree logic updated
- [ ] Prompt consistency maintained

**Implementation Notes**:
- Added at line: [Line number in system prompt]
- Guidelines focus: [Key criteria for AI component selection]

### ✅ Step 3: Editor UI (`app.js` createComponentElement)
- [ ] Case added to `createComponentElement()` function
- [ ] Form controls for all parameters
- [ ] Component header with remove button
- [ ] Input validation and event binding
- [ ] Auto-save integration

**Implementation Location**: After line 524 in `createComponentElement()`

**Implementation Notes**:
```javascript
case 'your-component':
    div.innerHTML = `
        <div class="component-header">
            <h4>Your Component</h4>
            <button class="remove-component">×</button>
        </div>
        // Form controls for parameters
    `;
    break;
```

### ✅ Step 4: Preview Generation (`app.js` generatePreviewHTML)
- [ ] Case added to `generatePreviewHTML()` function
- [ ] Parameter extraction from form elements
- [ ] HTML template for preview rendering
- [ ] Text formatting with `formatTextForPreview()`
- [ ] Style variants handled

**Implementation Location**: After line 1247 in `generatePreviewHTML()`

### ✅ Step 5: Data Extraction (`app.js` extractComponentData)
- [ ] Case added to `extractComponentData()` function
- [ ] All parameters extracted from DOM
- [ ] Data validation before storage
- [ ] Proper field mapping

**Implementation Location**: After line 1576 in `extractComponentData()`

### ⚠️ Step 6: Population Logic (`app.js` populateComponentInputs)
**CRITICAL**: This step is often forgotten and causes AI components to appear empty!

- [ ] Case added to `populateComponentInputs()` function
- [ ] All parameters populated from data to DOM
- [ ] Null/undefined value handling
- [ ] Dropdown/select value setting
- [ ] Content editable field population

**Implementation Location**: After line 934 in `populateComponentInputs()`

**Testing**: AI-generated components should have content, not be empty!

### ✅ Step 7: Student Rendering (`student-view.js`)
- [ ] Case added to main render switch statement (after line 99)
- [ ] Dedicated render method created (after line 181)
- [ ] Parameter handling and defaults
- [ ] Student-appropriate styling applied
- [ ] Responsive design considerations

**Implementation Notes**:
```javascript
case 'your-component':
    return this.renderYourComponent(params);

renderYourComponent(params) {
    // Implementation
}
```

### ✅ Step 8: CSS Styling (2 files required)
- [ ] **Editor styles** added to `styles.css` (after line 2028)
- [ ] **Student styles** added to `student-view.css` (after line 340)
- [ ] Preview and student styles consistent
- [ ] Responsive breakpoints included
- [ ] Accessibility considerations

**Editor Styles** (`styles.css`):
```css
.preview-your-component {
    /* Preview styling */
}
```

**Student Styles** (`student-view.css`):
```css
.student-your-component {
    /* Student view styling */
}
```

### ✅ Step 9: UI Button (`index.html`)
- [ ] Draggable component item added (after line 113)
- [ ] Hidden API button added (after line 143)
- [ ] Appropriate icon selected
- [ ] Descriptive component name
- [ ] Drag-and-drop functionality works

**Implementation Notes**:
```html
<!-- In Learning Components section -->
<div class="component-item" draggable="true" data-component-type="your-component">
    <i class="fas fa-icon"></i>
    <span>Component Name</span>
</div>

<!-- In hidden buttons section -->
<button id="api-add-your-component" onclick="insertComponent('your-component')">Add Component</button>
```

## Testing Requirements

### Manual Testing Flow
- [ ] **Step 1**: Click component button → Component appears in editor
- [ ] **Step 2**: Type content → Form inputs work correctly
- [ ] **Step 3**: Preview updates → Live preview renders correctly
- [ ] **Step 4**: Save node → Data persists to database
- [ ] **Step 5**: Reload page → Component content remains (not empty!)
- [ ] **Step 6**: Student view → Component displays correctly for students

### AI Integration Testing
- [ ] **PDF Upload**: Upload test PDF with relevant content
- [ ] **Component Extraction**: AI correctly identifies and creates component
- [ ] **Non-Empty Components**: AI-generated components have actual content
- [ ] **Parameter Accuracy**: AI fills parameters correctly
- [ ] **Preview Rendering**: AI components render in preview

### Integration Testing
- [ ] Component validation: `validate_component_parameters()` passes
- [ ] Database storage: Component saves to `node_components` table
- [ ] Session scoping: Component tied to correct session
- [ ] Auto-save: Changes trigger auto-save correctly

## Common Integration Failures

### Step 6 Missing (Most Common)
**Symptom**: AI components appear empty in editor
**Cause**: Missing `populateComponentInputs()` case
**Solution**: Add population logic for all parameters

### CSS Missing
**Symptom**: Components look broken in preview/student view
**Cause**: Missing styles in one or both CSS files
**Solution**: Add styles to both `styles.css` and `student-view.css`

### Parameter Mismatch
**Symptom**: Validation errors, saving fails
**Cause**: Schema parameters don't match form inputs
**Solution**: Ensure parameter names consistent across all steps

### Event Binding Issues
**Symptom**: Dropdowns don't trigger auto-save
**Cause**: Missing event listeners for dynamic content
**Solution**: Add event binding in `createComponentElement()`

## File Modification Summary

**Files Modified** (Report these 7 files when complete):
1. `component_schemas.py` - Schema definition and validation
2. `vision_processor.py` - AI training and component recognition
3. `app.js` - Editor UI, preview, extraction, population (4 functions)
4. `student-view.js` - Student rendering and display
5. `index.html` - UI buttons and drag-and-drop
6. `styles.css` - Editor and preview styling
7. `student-view.css` - Student view styling

**Total Lines Added**: ~100 lines across 7 files

## Validation Checklist

### Code Quality
- [ ] No TypeScript/JavaScript errors
- [ ] Consistent naming conventions (kebab-case for types)
- [ ] Proper error handling for edge cases
- [ ] No memory leaks or performance issues

### Educational Quality
- [ ] Component enhances learning experience
- [ ] Age-appropriate for target grade level
- [ ] Accessible to diverse learning styles
- [ ] Clear and intuitive for students

### Architecture Compliance
- [ ] Follows established component patterns
- [ ] Uses transaction context for database operations
- [ ] Includes confidence scoring for AI generation
- [ ] Maintains system consistency

---

## Implementation Notes

[Space for detailed implementation notes, challenges encountered, decisions made, and lessons learned]

---

*This template auto-activates when component integration work is detected. Use it to ensure all 9 steps are completed correctly and no integration steps are missed.*