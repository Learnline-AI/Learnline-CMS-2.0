# Template Auto-Selection System Test

## Test Scenarios

### Scenario 1: Component Integration Work
**Input Prompt**: "I need to add a new definition component for mathematical terms"
**Expected Skill Activation**: `component-integration-patterns`
**Expected Template**: `component-integration-template.md`
**Reason**: Contains "component", "add component", "definition"

### Scenario 2: CSV Knowledge Graph Work
**Input Prompt**: "Help me import the new CSV files for the fractions knowledge graph"
**Expected Skill Activation**: `csv-knowledge-graph`
**Expected Template**: `csv-import-feature-template.md`
**Reason**: Contains "import", "CSV", "knowledge graph"

### Scenario 3: Educational Feature with Multiple Systems
**Input Prompt**: "Create a new math lesson about fractions with components and CSV data"
**Expected Skill Activation**: `component-integration-patterns`, `csv-knowledge-graph`
**Expected Template**: `educational-feature-template.md` (umbrella template)
**Reason**: Educational context + multiple skills activated

### Scenario 4: Vision AI Enhancement
**Input Prompt**: "Improve the PDF processing to better extract fraction diagrams"
**Expected Skill Activation**: `vision-ai-pipeline`
**Expected Template**: `vision-ai-improvement-template.md`
**Reason**: Contains "PDF processing", "extract"

### Scenario 5: Session Management Work
**Input Prompt**: "Fix the auto-save feature and add transaction safety"
**Expected Skill Activation**: `session-persistence`
**Expected Template**: `session-feature-template.md`
**Reason**: Contains "auto-save", "transaction", "feature"

### Scenario 6: API Endpoint Development
**Input Prompt**: "Create a new API endpoint for managing student progress"
**Expected Skill Activation**: Multiple possible
**Expected Template**: `api-endpoint-template.md`
**Reason**: Contains "API", "endpoint"

### Scenario 7: Cross-Boundary Educational Work
**Input Prompt**: "Build a math assessment system that uses components, saves to database, and works with our knowledge graph"
**Expected Skill Activation**: `component-integration-patterns`, `session-persistence`, `csv-knowledge-graph`
**Expected Template**: `educational-feature-template.md`
**Reason**: Educational context + multiple architectural boundaries

## Validation Method

The enhanced `skill-activation.ts` hook should:

1. **Detect Keywords**: Parse user prompt for trigger words
2. **Activate Skills**: Identify relevant skills based on keywords
3. **Recommend Templates**: Suggest appropriate templates based on activated skills
4. **Handle Multi-Skill Scenarios**: Use umbrella template for complex features
5. **Provide Context**: Include educational domain detection

## Expected Output Format

When template auto-selection works correctly, users should see:

```
🎯 **Auto-activated skills**: component-integration-patterns

📋 **Recommended templates**:
- `dev-docs/templates/component-integration-template.md`

📋 **Component Integration**: Follow 9-step pattern exactly, validate each step
```

For educational multi-skill scenarios:

```
🎯 **Auto-activated skills**: component-integration-patterns, csv-knowledge-graph

📚 Educational domain context detected

📋 **Recommended templates**:
- `dev-docs/templates/educational-feature-template.md`
- `dev-docs/templates/component-integration-template.md`
- `dev-docs/templates/csv-import-feature-template.md`

⚠️ **Important reminders**:
- 🔄 Multi-boundary operation detected: frontend + backend

📋 **Component Integration**: Follow 9-step pattern exactly, validate each step
📊 **CSV Import**: CSV → Session nodes → Relationships → Visual network update
```

## Template Completeness Check

All referenced templates should exist:
- ✅ `educational-feature-template.md` - Created
- ✅ `component-integration-template.md` - Created
- ✅ `csv-import-feature-template.md` - Created
- ✅ `vision-ai-improvement-template.md` - Created
- ✅ `session-feature-template.md` - Created
- ✅ `api-endpoint-template.md` - Created

## Integration Validation

### Skill Activation Keywords Working
The hook should detect these trigger patterns:
- Component work: "component", "add component", "definition", "heading", etc.
- CSV work: "csv", "import", "knowledge graph", "relationship", "N001", etc.
- Session work: "session", "auto-save", "transaction", "persistence", etc.
- Vision AI work: "vision", "PDF", "processing", "590-line prompt", etc.
- Educational context: "math", "education", "student", "NCERT", "curriculum", etc.

### Template Recommendation Logic Working
- Single skill → Specific template
- Multiple skills + educational context → Educational umbrella template
- Cross-boundary operations → Multiple template suggestions
- API/endpoint work → API template addition

### Hook Integration Functioning
- Template recommendations appear in skill activation messages
- Data includes `recommendedTemplates` array
- Templates are properly formatted with full paths
- No broken references or missing templates

## Success Criteria

✅ **Template Auto-Selection Complete** when:
1. All 6 core templates created and functional
2. Enhanced skill-activation.ts hook working correctly
3. Template recommendations appear for relevant prompts
4. Educational umbrella template activates for complex features
5. No broken template references
6. Templates provide actionable guidance for development work

This validates that the template auto-selection system successfully addresses the core context loss problem identified in the comprehensive plan.