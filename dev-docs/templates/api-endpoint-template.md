# API Endpoint Template

**Endpoint Name**: [Brief description of API endpoint]
**Task ID**: [UUID - auto-generated]
**Created**: [Date]
**Status**: Planning | Implementation | Testing | Documentation | Complete

## Endpoint Overview

### API Specification
- **Method**: [ ] GET [ ] POST [ ] PUT [ ] DELETE [ ] PATCH
- **Path**: `/api/path/to/endpoint`
- **Session Integration**: [ ] Session-scoped [ ] Session-agnostic [ ] Session-optional
- **Authentication**: [ ] Required [ ] Optional [ ] None
- **Rate Limiting**: [ ] Required [ ] Optional [ ] None

### Business Logic
- **Primary Purpose**: [What this endpoint does]
- **Educational Context**: [How this relates to educational CMS functionality]
- **Data Operations**: [What data is created/read/updated/deleted]
- **Integration Points**: [Other systems this endpoint interacts with]

## Session Integration Patterns

### Session-Scoped Endpoints
**Pattern**: `/session/{session_id}/resource`
- [ ] Session validation before operation
- [ ] All data scoped to provided session
- [ ] Error handling for invalid sessions
- [ ] Access timestamp update on validation

**Implementation Pattern**:
```python
@app.get("/session/{session_id}/resource")
async def get_resource(session_id: str, db: DatabaseManager = Depends(get_db)):
    # Validate session first
    if not await db.validate_session(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    # Proceed with session-scoped operation
```

### Session-Agnostic Endpoints
**Pattern**: `/api/resource` (no session in path)
- [ ] No session validation required
- [ ] Global data operations
- [ ] System-level functionality
- [ ] Health checks and metadata

## Request/Response Design

### Request Schema
```python
class RequestModel(BaseModel):
    # Define request parameters
    field1: str
    field2: Optional[int] = None
    field3: List[str] = []

    class Config:
        schema_extra = {
            "example": {
                "field1": "example value",
                "field2": 42,
                "field3": ["item1", "item2"]
            }
        }
```

### Response Schema
```python
class ResponseModel(BaseModel):
    # Define response structure
    success: bool
    data: Optional[Dict[str, Any]] = None
    message: str

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {"result": "value"},
                "message": "Operation completed successfully"
            }
        }
```

### Error Response Schema
```python
class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
    error_code: Optional[str] = None
```

## Database Integration

### Transaction Safety
**Single Operation**:
- [ ] Simple read/write operations
- [ ] No transaction context needed
- [ ] Direct database calls acceptable

**Multi-Operation Sequence**:
- [ ] Multiple related database operations
- [ ] Requires transaction context for atomicity
- [ ] Rollback on any operation failure

**Transaction Pattern**:
```python
async with db.transaction_context() as session:
    # Multiple operations here
    # All commit together or rollback
```

### Query Optimization
**Session-Scoped Queries**:
- [ ] Use session_id in WHERE clauses
- [ ] Leverage database indexes on session_id
- [ ] Consider pagination for large result sets
- [ ] Optimize joins involving session data

**Performance Considerations**:
- [ ] Query plan analysis for complex operations
- [ ] Batch operations where appropriate
- [ ] Connection pooling utilization
- [ ] Caching strategies for frequently accessed data

## Validation & Error Handling

### Input Validation
**Pydantic Model Validation**:
- [ ] Required fields properly marked
- [ ] Type validation for all parameters
- [ ] Custom validators for business logic
- [ ] Clear error messages for validation failures

**Business Logic Validation**:
- [ ] Session existence and validity
- [ ] Resource ownership and permissions
- [ ] Data consistency requirements
- [ ] Educational domain constraints

### Error Handling Patterns
**Common HTTP Status Codes**:
- `200 OK`: Successful operation
- `201 Created`: Resource successfully created
- `400 Bad Request`: Invalid input or validation failure
- `404 Not Found`: Session or resource not found
- `409 Conflict`: Data conflict or constraint violation
- `500 Internal Server Error`: Unexpected system error

**Error Response Structure**:
```python
try:
    # Endpoint logic
    return {"success": True, "data": result}
except ValidationError as e:
    raise HTTPException(status_code=400, detail=str(e))
except SessionNotFound:
    raise HTTPException(status_code=404, detail="Session not found")
except DatabaseError as e:
    logger.error(f"Database error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

## Educational CMS Integration

### Component System Integration
**Component-Related Endpoints**:
- [ ] Component creation/update endpoints
- [ ] Component validation integration
- [ ] Schema compliance checking
- [ ] Auto-save coordination

### Knowledge Graph Integration
**Graph-Related Endpoints**:
- [ ] Node operations (CRUD)
- [ ] Relationship management
- [ ] CSV import coordination
- [ ] Visual network data provision

### Session Management Integration
**Session-Related Operations**:
- [ ] Session lifecycle management
- [ ] Auto-save trigger coordination
- [ ] Data persistence verification
- [ ] Recovery mechanism support

## Performance Requirements

### Response Time Targets
- **Simple queries**: < 100ms
- **Complex operations**: < 500ms
- **Bulk operations**: < 2000ms
- **File uploads**: Progress indication

### Scalability Considerations
**Database Performance**:
- [ ] Efficient query patterns
- [ ] Proper indexing strategy
- [ ] Connection pooling utilization
- [ ] Query optimization

**Memory Management**:
- [ ] Efficient data loading
- [ ] Streaming for large responses
- [ ] Garbage collection considerations
- [ ] Memory leak prevention

## Security Considerations

### Input Sanitization
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Path traversal prevention
- [ ] File upload validation (if applicable)

### Session Security
- [ ] Session ID validation
- [ ] Session hijacking prevention
- [ ] Secure session storage
- [ ] Session timeout handling

### Data Protection
- [ ] Sensitive data encryption
- [ ] API key protection
- [ ] Logging without sensitive data
- [ ] Error message sanitization

## Testing Strategy

### Unit Testing
**Test Coverage Requirements**:
- [ ] All endpoint logic paths
- [ ] Input validation scenarios
- [ ] Error handling conditions
- [ ] Database operation mocking

**Test Cases**:
```python
async def test_endpoint_success():
    # Test successful operation

async def test_endpoint_invalid_session():
    # Test invalid session handling

async def test_endpoint_validation_error():
    # Test input validation errors

async def test_endpoint_database_error():
    # Test database error handling
```

### Integration Testing
**Database Integration**:
- [ ] Real database operations
- [ ] Transaction rollback testing
- [ ] Concurrent access scenarios
- [ ] Data consistency verification

**Session Integration**:
- [ ] Valid session operations
- [ ] Invalid session handling
- [ ] Session scoping verification
- [ ] Access timestamp updates

### Performance Testing
**Load Testing**:
- [ ] Concurrent request handling
- [ ] Database connection limits
- [ ] Memory usage under load
- [ ] Response time degradation

## Documentation Requirements

### API Documentation
**OpenAPI/Swagger Integration**:
- [ ] Clear endpoint description
- [ ] Request/response examples
- [ ] Parameter documentation
- [ ] Error code explanations

**Usage Examples**:
```python
# Example usage
response = requests.post(
    "http://localhost:8000/session/123/endpoint",
    json={"field1": "value"},
    headers={"Content-Type": "application/json"}
)
```

### Developer Documentation
**Implementation Notes**:
- [ ] Business logic explanation
- [ ] Integration pattern documentation
- [ ] Performance considerations
- [ ] Troubleshooting guide

## Deployment Considerations

### Environment Configuration
- [ ] Database connection settings
- [ ] API key configuration
- [ ] Logging level settings
- [ ] Performance monitoring

### Monitoring & Logging
**Logging Requirements**:
- [ ] Request/response logging
- [ ] Error condition logging
- [ ] Performance metrics
- [ ] Security event logging

**Monitoring Alerts**:
- [ ] High error rates
- [ ] Performance degradation
- [ ] Database connection issues
- [ ] Security incidents

## Completion Checklist

### Implementation Complete
- [ ] Endpoint logic implemented
- [ ] Input validation working
- [ ] Error handling comprehensive
- [ ] Database integration tested

### Integration Verified
- [ ] Session integration working
- [ ] Frontend integration successful
- [ ] Database operations atomic
- [ ] Performance acceptable

### Documentation Updated
- [ ] API documentation current
- [ ] Code comments comprehensive
- [ ] Usage examples provided
- [ ] Error handling documented

### Testing Passed
- [ ] Unit tests passing
- [ ] Integration tests successful
- [ ] Performance tests acceptable
- [ ] Security validation complete

---

## Implementation Notes

[Space for detailed implementation notes, integration challenges, performance optimizations, and lessons learned during development]

---

*This template auto-activates when API, endpoint, or route development work is detected. Use it to ensure consistent FastAPI patterns and proper session integration.*