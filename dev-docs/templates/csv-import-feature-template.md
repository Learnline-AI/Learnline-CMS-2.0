# CSV Knowledge Graph Feature Template

**Feature Name**: [Brief description of CSV/Knowledge Graph work]
**Task ID**: [UUID - auto-generated]
**Created**: [Date]
**Status**: Planning | CSV Parsing | Node Creation | Relationship Building | Visual Network | Complete

## Knowledge Graph Overview

### Data Source Analysis
- **CSV Source**: [File path or description]
- **Expected Files**:
  - [ ] `node-export.csv` (or files with "nodes" in filename)
  - [ ] `relationship-export.csv` (or files with "relationships" in filename)
  - [ ] `graph-export.csv` (optional metadata)
- **Data Size**: [Estimated nodes/relationships]
- **Content Domain**: [Math topic, grade level, curriculum area]

### Node Type Distribution
- **Core Nodes** (N###): [Count] - Main learning objectives
- **Support Nodes** (S###): [Count] - Prerequisites and foundational concepts
- **Enrichment Nodes** (E###): [Count] - Advanced/optional content

## CSV Structure Validation

### Node Export CSV Requirements
**Required Columns**:
- [ ] `~id`: Internal Neo4j ID (used for relationship mapping)
- [ ] `node_id`: Display ID (N001, N002, S001, E001, etc.)
- [ ] `~labels`: Node type (Node;core, Node;support, Node;enrichment)
- [ ] `name`/`title`: Display name for the node
- [ ] `description`: Content description
- [ ] `difficulty`: 1-5 difficulty level
- [ ] `time_minutes`: Estimated completion time
- [ ] `textbook_pages`: Page references (optional)
- [ ] `type`: core/support/enrichment

**Data Quality Checks**:
- [ ] Node IDs follow correct pattern (N###, S###, E###)
- [ ] No duplicate `~id` values
- [ ] All required fields populated
- [ ] Difficulty levels within 1-5 range

### Relationship Export CSV Requirements
**Required Columns**:
- [ ] `~start_node_id`: Source node Neo4j ID
- [ ] `~end_node_id`: Target node Neo4j ID
- [ ] `~relationship_type`: LEADS_TO, PREREQUISITE_FOR, PREREQUISITE
- [ ] `explanation`: Human-readable relationship description

**Relationship Types**:
- **LEADS_TO**: Source enables target (learning progression)
- **PREREQUISITE_FOR**: Prerequisite enables dependent
- **PREREQUISITE**: Dependent requires prerequisite

**Data Quality Checks**:
- [ ] All relationship IDs exist in node CSV
- [ ] No self-relationships (node → same node)
- [ ] Relationship types are valid
- [ ] Explanations provided for all relationships

## 4-Step Import Workflow

### ✅ Step 1: CSV File Parsing
**Implementation**: `app.js` → `handleCsvFileSelection()` → `CSVParser.parseFile()`

**Progress Checklist**:
- [ ] File selection dialog working (`openCsvFileDialog()`)
- [ ] File type validation (CSV files only)
- [ ] CSV parsing with comma-separated values
- [ ] Quoted field handling for complex content
- [ ] Line break and special character handling
- [ ] Error reporting for malformed CSV

**Validation**:
- [ ] Node CSV parses successfully
- [ ] Relationship CSV parses successfully
- [ ] Required columns present in both files
- [ ] Data types match expected format

### ✅ Step 2: Session Node Creation
**Implementation**: `app.js` → `createSessionNodesFromCsv()`

**Progress Checklist**:
- [ ] Session validation before node creation
- [ ] Node metadata extraction (type, difficulty, time_minutes, description)
- [ ] API calls to `/session/{session_id}/nodes` endpoint
- [ ] Error handling for failed node creation
- [ ] Progress reporting to user interface
- [ ] Graceful degradation (continue if some nodes fail)

**Data Mapping**:
- CSV `node_id` → Session node identifier
- CSV `name`/`title` → Node display name
- CSV `description` → Node content description
- CSV `type` → Node category (core/support/enrichment)
- CSV metadata → JSON in `raw_content` field

**Validation**:
- [ ] All nodes created in database
- [ ] Session-scoped storage working
- [ ] Node metadata preserved correctly
- [ ] Success/failure counts accurate

### ✅ Step 3: Relationship Processing & Creation
**Implementation**: `app.js` → `processRelationships()` → `createSessionRelationshipsFromCsv()`

**Progress Checklist**:
- [ ] CSV ID mapping built: `csvIdMap.set(node['~id'], node.node_id)`
- [ ] Relationship validation using ID mapping
- [ ] Self-relationship filtering
- [ ] Invalid mapping detection and reporting
- [ ] Bulk relationship creation via `/session/{session_id}/relationships/bulk`
- [ ] Transaction safety with atomic operations

**Relationship Processing**:
```javascript
// ID mapping for relationship resolution
csvIdMap.set(node['~id'], node.node_id);

// Relationship object creation
{
  from_node_id: fromNodeId,
  to_node_id: toNodeId,
  relationship_type: type,
  explanation: explanation
}
```

**Validation**:
- [ ] All valid relationships created
- [ ] Invalid relationships filtered out
- [ ] Session scoping working correctly
- [ ] Transaction atomicity maintained

### ✅ Step 4: Visual Network Update
**Implementation**: `app.js` → `clearVisualNetwork()` → visual node creation → view mode switch

**Progress Checklist**:
- [ ] Existing visual nodes cleared
- [ ] New visual nodes created for each imported node
- [ ] Node connections built from relationships
- [ ] Visual network canvas updated
- [ ] Automatic switch to visual view mode
- [ ] Manual positioning system enabled

**Visual Network Integration**:
- `visualNodes` Map populated: `nodeId → VisualNode`
- `nodeConnections` Map populated: `nodeId → [connected nodeIds]`
- Canvas rendering with zoom/pan functionality
- Node positioning with drag-and-drop

**Validation**:
- [ ] Visual network displays all nodes
- [ ] Connections between nodes visible
- [ ] Zoom/pan functionality working
- [ ] Node positioning can be manually adjusted

## Session & Database Integration

### Transaction Safety
**Requirements**:
- [ ] Multi-operation sequences use `transaction_context()`
- [ ] Atomic node creation (all or none)
- [ ] Atomic relationship creation (all or none)
- [ ] Rollback on partial failures
- [ ] Progress tracking with reliable state

**Implementation Pattern**:
```python
async with db_manager.transaction_context() as session:
    # Create all nodes
    # Create all relationships
    # Commit atomically
```

### Session Scoping
**Data Storage**:
- [ ] All nodes scoped to current session
- [ ] All relationships scoped to current session
- [ ] Session validation before import
- [ ] Session persistence (100-year expiry)

**Database Tables**:
- `nodes`: session_id + node_id + raw_content (JSON metadata)
- `session_relationships`: session_id + from_node_id + to_node_id + type + explanation

## Error Handling & Validation

### Import Error Patterns
**CSV File Issues**:
- [ ] Missing required columns → Clear error message with expected format
- [ ] Invalid CSV format → Parsing error with line number
- [ ] Empty files → Informative user message
- [ ] Large files → Progress indication and memory management

**Data Validation Issues**:
- [ ] Invalid node IDs → Skip with warning, continue import
- [ ] Missing relationships → Report orphaned nodes
- [ ] Circular dependencies → Detection and reporting
- [ ] Invalid relationship types → Skip with warning

**System Integration Issues**:
- [ ] Session not found → Create new session or error
- [ ] Database connection issues → Retry logic with exponential backoff
- [ ] Memory issues with large imports → Batch processing
- [ ] API timeout issues → Progress callbacks and resumable imports

### User Feedback
**Progress Indicators**:
- [ ] File parsing progress
- [ ] Node creation progress
- [ ] Relationship building progress
- [ ] Visual network update progress

**Success/Failure Reporting**:
- [ ] Summary: X nodes created, Y relationships built
- [ ] Error details: Failed nodes/relationships with reasons
- [ ] Data quality warnings: Missing fields, invalid formats
- [ ] Performance metrics: Import time, memory usage

## Testing Strategy

### CSV Import Testing
**Test Data Sets**:
- [ ] Small dataset (10 nodes, 15 relationships) - Basic functionality
- [ ] Medium dataset (50 nodes, 100 relationships) - Performance testing
- [ ] Large dataset (200+ nodes, 500+ relationships) - Stress testing
- [ ] Malformed data - Error handling validation

**Workflow Testing**:
- [ ] Complete workflow: CSV files → Import → Visual network display
- [ ] Partial failures: Some nodes fail, import continues
- [ ] Recovery testing: Interrupt import, restart, verify state
- [ ] Session persistence: Import, reload page, verify data preserved

### Knowledge Graph Validation
**Graph Integrity**:
- [ ] All nodes accessible through relationships
- [ ] No orphaned nodes (unless intentional)
- [ ] Relationship consistency (bidirectional where expected)
- [ ] Learning progression logic (prerequisites before dependents)

**Educational Quality**:
- [ ] Node difficulty progression makes sense
- [ ] Prerequisite relationships educationally sound
- [ ] Learning paths coherent and complete
- [ ] Content alignment with curriculum standards

## Performance Considerations

### Memory Management
- [ ] Batch processing for large CSV files (process in chunks)
- [ ] Memory cleanup after processing
- [ ] Progress callbacks to prevent UI freezing
- [ ] Garbage collection for large objects

### Database Performance
- [ ] Bulk operations for node/relationship creation
- [ ] Transaction batching for optimal performance
- [ ] Index utilization for session-scoped queries
- [ ] Connection pooling for concurrent operations

### Visual Network Performance
- [ ] Efficient rendering for large graphs (50+ nodes)
- [ ] Canvas optimization and redraw minimization
- [ ] Position caching for frequently accessed nodes
- [ ] Lazy loading for detailed node information

## API Endpoints Used

### Session Management
- `POST /session/create` - Create new session for import (if needed)
- `GET /session/validate/{session_id}` - Verify session exists

### Node Operations
- `POST /session/{session_id}/nodes` - Create individual session nodes
- `GET /session/{session_id}/nodes` - Retrieve all session nodes

### Relationship Operations
- `POST /session/{session_id}/relationships/bulk` - Bulk create relationships
- `GET /session/{session_id}/relationships` - Retrieve session relationships

## Completion Criteria

### Import Success Metrics
- [ ] All valid CSV data imported successfully
- [ ] Visual network displays complete graph
- [ ] Session persistence working correctly
- [ ] Performance acceptable for target data sizes

### Data Quality Metrics
- [ ] Node coverage: All expected learning topics included
- [ ] Relationship completeness: Learning paths well-connected
- [ ] Educational coherence: Prerequisite logic sound
- [ ] User experience: Import process intuitive and reliable

### Integration Metrics
- [ ] Component attachment: Nodes can have component sequences added
- [ ] Search functionality: Graph searchable and navigable
- [ ] Export capability: Data can be exported if needed
- [ ] Versioning support: Multiple graph versions manageable

---

## Implementation Notes

[Space for detailed notes about data sources, mapping decisions, performance optimizations, and lessons learned during implementation]

---

*This template auto-activates when CSV import or knowledge graph work is detected. Use it to ensure the complete CSV → Session → Visual network workflow is implemented correctly.*