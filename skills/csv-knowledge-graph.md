# CSV Knowledge Graph Skill

## Auto-Activation Triggers
- "csv", "CSV", "import", "knowledge graph"
- "node", "relationship", "LEADS_TO", "PREREQUISITE"
- "visual network", "graph", "Neo4j"
- "N001", "N002", "S001", "E001" (node ID patterns)
- "importCsv", "processCsvFiles", "createSessionNodes"

## System Architecture (NOT Neo4j)

### CSV-Driven Knowledge Graph
The system uses **CSV files**, not Neo4j direct integration:
- Source: `/Users/user/Downloads/Finished Fractions KG/`
- Files: `node-export.csv`, `relationship-export.csv`, `graph-export.csv`
- Storage: SQLite `session_relationships` table
- Visualization: Canvas-based visual network with manual positioning

### CSV File Structure

#### Node Export CSV (`node-export.csv`)
Required columns:
- `~id`: Internal Neo4j ID (used for relationship mapping)
- `node_id`: Display ID (N003, S001, E001)
- `~labels`: Node type (Node;core, Node;support, Node;enrichment)
- `name`/`title`: Display name
- `description`: Content description
- `difficulty`: 1-5 difficulty level
- `time_minutes`: Estimated completion time
- `textbook_pages`: Page references
- `type`: core/support/enrichment

#### Relationship Export CSV (`relationship-export.csv`)
Required columns:
- `~start_node_id`: Source node Neo4j ID
- `~end_node_id`: Target node Neo4j ID
- `~relationship_type`: LEADS_TO, PREREQUISITE_FOR, PREREQUISITE
- `explanation`: Human-readable relationship description

### Import Workflow Pattern

#### 1. CSV File Selection (`app.js` handleCsvFileSelection)
```javascript
// Triggered by importCsvBtn click
// Looks for files with specific names:
// - "node-export" or "nodes" in filename
// - "relationship-export" or "relationships" in filename
```

#### 2. CSV Parsing (`app.js` CSVParser class)
```javascript
class CSVParser {
    async parseFile(file) {
        // Reads file as text
        // Parses CSV with comma-separated values
        // Handles quoted fields and line breaks
        // Returns array of objects
    }
}
```

#### 3. Session Node Creation (`app.js` createSessionNodesFromCsv)
```javascript
// Maps CSV nodes to session nodes in database
// Extracts metadata: type, difficulty, time_minutes, description
// Creates nodes via `/session/{session_id}/nodes` API
// Handles errors gracefully - continues if some nodes fail
```

#### 4. Relationship Processing (`app.js` processRelationships)
```javascript
// Builds CSV ID mapping: csvIdMap.set(node['~id'], node.node_id)
// Validates relationships using ID mapping
// Creates relationship objects with from/to/type/explanation
// Filters out self-relationships and invalid mappings
```

#### 5. Session Relationship Creation (`app.js` createSessionRelationshipsFromCsv)
```javascript
// Bulk creates relationships via `/session/{session_id}/relationships/bulk` API
// Uses transaction-safe database operations
// All relationships scoped to current session
```

#### 6. Visual Network Update (`app.js` clearVisualNetwork + node creation)
```javascript
// Clears existing visual nodes
// Creates new visual nodes for each imported node
// Builds node connections for visual rendering
// Switches to visual view mode
```

### Node Types and Patterns

#### Core Nodes (Learning Content)
- **Pattern**: N001, N002, N003, etc.
- **Type**: core
- **Labels**: Node;core
- **Purpose**: Main learning objectives

#### Support Nodes (Prerequisites)
- **Pattern**: S001, S002, S003, etc.
- **Type**: support
- **Labels**: Node;support
- **Purpose**: Required prior knowledge

#### Enrichment Nodes (Extensions)
- **Pattern**: E001, E002, E003, etc.
- **Type**: enrichment
- **Labels**: Node;enrichment
- **Purpose**: Advanced/optional content

### Relationship Types

#### LEADS_TO
- **Direction**: Source → Target
- **Meaning**: Completing source enables target
- **Example**: "N003 LEADS_TO N004" (fractions → number line)

#### PREREQUISITE_FOR
- **Direction**: Prerequisite → Dependent
- **Meaning**: Prerequisite must be completed before dependent
- **Example**: "S001 PREREQUISITE_FOR N003" (equal sharing → fractions)

#### PREREQUISITE
- **Direction**: Dependent → Prerequisite
- **Meaning**: Dependent requires prerequisite
- **Example**: "N004 PREREQUISITE S004" (number line → number line skills)

### Database Integration Patterns

#### Session-Scoped Storage
All CSV data is stored per session in SQLite:
- `nodes`: session_id + node_id + raw_content (JSON metadata)
- `session_relationships`: session_id + from_node_id + to_node_id + type + explanation

#### Transaction Safety
CSV import uses transaction context:
```python
async with db_manager.transaction_context() as session:
    # Create all nodes
    # Create all relationships
    # Commit atomically
```

### Visual Network Integration

#### Canvas-Based Rendering
- Uses HTML5 Canvas for network visualization
- Manual node positioning with drag-and-drop
- Zoom and pan functionality
- Position persistence in database

#### Visual Node Management
```javascript
// Visual nodes stored in Map: nodeId -> VisualNode
this.visualNodes = new Map();
// Connections stored separately: nodeId -> [connected nodeIds]
this.nodeConnections = new Map();
```

### Error Handling Patterns

#### Graceful Degradation
- Continue import if some nodes fail to create
- Log errors but don't stop entire process
- Report success/failure counts to user
- Provide detailed error information

#### Validation Checks
- Verify required CSV columns exist
- Validate node ID formats
- Check relationship mapping completeness
- Ensure session exists before import

### API Endpoints Used

#### Session Management
- `POST /session/create` - Create new session for import
- `GET /session/validate/{session_id}` - Verify session exists

#### Node Operations
- `POST /session/{session_id}/nodes` - Create session node
- `GET /session/{session_id}/nodes` - Retrieve session nodes

#### Relationship Operations
- `POST /session/{session_id}/relationships/bulk` - Bulk create relationships
- `GET /session/{session_id}/relationships` - Retrieve session relationships

### CSV Import Debugging

#### Log Analysis Patterns
```javascript
console.log('🚀 === CSV IMPORT STARTED ===');
console.log('📊 CSV Session Node Creation Summary:');
console.log('🎯 Selecting first node:', firstNodeId);
console.log('🎉 CSV import completed successfully');
```

#### Common Import Issues
1. **Missing CSV columns**: Check for required ~id, node_id, ~relationship_type
2. **Invalid relationships**: Verify csvIdMap contains both source and target IDs
3. **Session errors**: Ensure session is created before node/relationship creation
4. **File format issues**: Check for proper CSV formatting, quotes, line endings

### Integration with Component System
CSV-imported nodes can have components attached:
- Use `node_id` from CSV as component sequence identifier
- Store component sequences in `node_components` table
- Session-scope components to imported session

### Performance Considerations
- Batch node creation with Promise.all()
- Use bulk relationship creation API
- Implement progress callbacks for large CSV files
- Memory management for large graphs (50+ nodes)

This pattern ensures consistent CSV → Session → Visual Network workflow while maintaining data integrity and user experience.