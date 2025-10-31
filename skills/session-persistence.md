# Session Persistence Skill

## Auto-Activation Triggers
- "session", "auto-save", "save", "persistence"
- "transaction", "database", "SQLite"
- "36-hour", "expiry", "expires", "recovery"
- "scheduleAutoSave", "sessionId", "validate_session"
- "transaction_context", "commit", "rollback"

## Session Architecture (NO 36-Hour Expiry Issue)

### Permanent Sessions
**IMPORTANT**: Sessions are permanent, NOT 36-hour expiry:
- Created with 100-year expiry: `datetime('now', '+100 years')`
- No automatic cleanup (cleanup disabled via `1=0` condition)
- Sessions persist indefinitely until manually deleted
- Auto-access timestamp updates on validation

### Session Lifecycle

#### 1. Session Creation (`database.py` create_session)
```python
async def create_session(self, user_id: str = "anonymous") -> str:
    session_id = str(uuid.uuid4())

    # Transaction ensures session + default nodes created atomically
    async with self.transaction_context() as session:
        # Create session with 100-year expiry
        session_query = """
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (:session_id, :user_id, datetime('now', '+100 years'))
        """
        await session.execute(text(session_query), {"session_id": session_id, "user_id": user_id})

        # Auto-create default starter nodes (N001, N002)
        # All in same transaction for atomicity
```

#### 2. Session Validation (`database.py` validate_session)
```python
async def validate_session(self, session_id: str) -> bool:
    # Transaction ensures validation + access update are atomic
    async with self.transaction_context() as session:
        # Check existence and update last_accessed in same transaction
        result = await session.execute(text(query), {"session_id": session_id})
        if session_exists:
            update_query = """
            UPDATE sessions SET last_accessed = datetime('now')
            WHERE id = :session_id
            """
            await session.execute(text(update_query), {"session_id": session_id})
```

### Transaction Safety Patterns

#### Transaction Context Manager
**ALWAYS use this pattern** for multi-operation sequences:
```python
async with db_manager.transaction_context() as session:
    # Multiple database operations
    # Auto-commit on success, auto-rollback on error
```

#### Critical Transaction Use Cases
1. **Session Creation**: Session + default nodes
2. **CSV Import**: Nodes + relationships
3. **Component Sequences**: Delete existing + insert new components
4. **Content Saving**: Node + content + template selections
5. **Relationship Management**: Create/update/delete with consistency

### Auto-Save System

#### Frontend Auto-Save (`app.js` scheduleAutoSave)
```javascript
scheduleAutoSave() {
    if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
        this.autoSaveContent();
    }, 2000); // 2-second delay
}
```

#### Auto-Save Triggers
- Component content changes (contenteditable events)
- Component reordering (drag-and-drop end)
- Component addition/removal
- Dropdown/selection changes
- Visual network position changes

#### Auto-Save Content Format
```javascript
async autoSaveContent() {
    const content = {
        nodeId: this.selectedNode,
        sessionId: this.sessionId,
        components: this.extractAllComponents(),
        suggested_template: "text-heavy",
        overall_confidence: 1.0
    };

    // API call to /session/{sessionId}/nodes/{nodeId}/content
}
```

### Database Persistence Layers

#### SQLite Schema for Sessions
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,           -- Set to +100 years
    session_data TEXT DEFAULT '{}'
);
```

#### Session-Scoped Data
All data is scoped to sessions:
- `nodes`: session_id + node_id + content
- `node_components`: session_id via nodes table foreign key
- `session_relationships`: session_id + relationship data
- `user_assignments`: session_id via nodes table foreign key

### State Management Patterns

#### What Persists in Database
1. **Session metadata**: ID, user, timestamps, expiry
2. **Node definitions**: ID, title, raw content, session association
3. **Component sequences**: Type, order, parameters, confidence
4. **Content assignments**: Category mappings, user confirmations
5. **Relationships**: Graph connections with explanations
6. **Visual positions**: Node coordinates for network display

#### What Persists in Frontend Memory
1. **Current session ID**: `this.sessionId`
2. **Selected node**: `this.selectedNode`
3. **Visual network state**: `this.visualNodes`, `this.nodeConnections`
4. **UI state**: View mode, panel collapse, zoom/pan
5. **Relationship cache**: `this.relationships` array

#### Session Recovery Workflow
```javascript
async initializeSession() {
    // Try to restore session from localStorage or create new
    let sessionId = localStorage.getItem('cms_session_id');

    if (sessionId) {
        // Validate existing session
        const isValid = await this.validateSession(sessionId);
        if (!isValid) {
            sessionId = null; // Force creation of new session
        }
    }

    if (!sessionId) {
        // Create new session
        sessionId = await this.createSession();
        localStorage.setItem('cms_session_id', sessionId);
    }

    this.sessionId = sessionId;
    // Load session data: nodes, relationships, positions
}
```

### Error Handling and Recovery

#### Transaction Rollback Patterns
```python
async def save_node_with_content_transactional(self, session_id: str, node_data: dict, content_data: dict):
    try:
        async with self.transaction_context() as session:
            # Create node
            # Save content to user_assignments
            # Save template selection
            return True
    except Exception as e:
        # Automatic rollback via context manager
        logger.error(f"Error saving node with content: {str(e)}")
        return False
```

#### Session Recovery Strategies
1. **Validation Retry**: Check session validity before operations
2. **Graceful Fallback**: Create new session if validation fails
3. **Partial Recovery**: Load available data, skip corrupted entries
4. **User Notification**: Inform user of recovery actions taken

### Component Sequence Persistence

#### Atomic Component Updates
```python
async def save_node_components(self, node_id: str, components: List[Dict], template: str, confidence: float):
    # Get internal node ID
    # Delete existing components (in transaction)
    # Insert new components (in transaction)
    # Serialize parameters as JSON
    # Validate against schemas before saving
```

#### Component Validation Before Storage
```python
# Validate each component against schemas
for component in components:
    is_valid, error_msg = validate_component_parameters(component["type"], component["parameters"])
    if not is_valid:
        # Log error and provide fallback
        component["validation_error"] = error_msg
```

### Performance Optimization

#### Batch Operations
- Use `Promise.all()` for parallel node creation
- Bulk relationship creation via single API call
- Transaction grouping for related operations

#### Memory Management
- Clear visual network on CSV import
- Garbage collection between batch operations
- Debounced auto-save (2-second delay)

### API Integration Patterns

#### Session-Aware Endpoints
All operations require valid session:
```javascript
// Always validate session before operations
const isValid = await this.validateSession(this.sessionId);
if (!isValid) {
    await this.createNewSession();
}

// Include session in API calls
const response = await fetch(`/session/${this.sessionId}/nodes`);
```

#### Error Response Handling
```javascript
if (response.status === 401) {
    // Session expired or invalid
    await this.handleSessionExpiry();
} else if (response.status === 500) {
    // Server error - retry with exponential backoff
    await this.retryOperation();
}
```

### Critical Recovery Points
1. **App Initialization**: Session validation and recovery
2. **Page Reload**: Restore session and UI state
3. **Network Errors**: Retry with session revalidation
4. **Database Errors**: Transaction rollback and user notification
5. **CSV Import Failures**: Partial import recovery

### Transaction Context Usage Rules
1. **Always use for multi-table operations**
2. **Keep transactions short and focused**
3. **Never nest transaction contexts**
4. **Handle exceptions within transaction blocks**
5. **Use atomic operations for critical state changes**

This ensures robust session management with permanent storage, transaction safety, and reliable recovery mechanisms.