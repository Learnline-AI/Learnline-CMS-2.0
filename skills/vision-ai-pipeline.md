# Vision AI Pipeline Skill

## Auto-Activation Triggers
- "vision", "AI", "PDF", "upload", "processing"
- "OpenAI", "GPT-4O", "vision_processor"
- "analyze_pdf", "component extraction", "590-line prompt"
- "retry", "timeout", "quality degradation"
- "batch processing", "memory management"

## Vision AI Architecture (OpenAI GPT-4O)

### Core System Components
- **Model**: GPT-4O (`gpt-4o`) for vision analysis
- **System Prompt**: 590-line detailed prompt in `vision_processor.py` (lines 67-591)
- **Retry Logic**: 4 attempts with exponential backoff
- **Quality Degradation**: Progressive image quality reduction (75→65→50→40)
- **Memory Management**: Batch processing with garbage collection

### The 590-Line System Prompt Structure

#### Prompt Architecture (Critical to Maintain)
```python
system_prompt = f"""═══════════════════════════════════════════════════════════════════
MISSION: Educational Math Content Designer
═══════════════════════════════════════════════════════════════════

You are building educational mathematics content for students. You are NOT a photocopier - you are an EDUCATIONAL DESIGNER.

{component_specs}  # Built from component_schemas.py

═══════════════════════════════════════════════════════════════════
⚠️ ANTI-PARAGRAPH-SPAM WARNING ⚠️
═══════════════════════════════════════════════════════════════════

DO NOT DEFAULT TO PARAGRAPHS FOR EVERYTHING!

DETAILED COMPONENT SELECTION GUIDE (When to Use What)
═══════════════════════════════════════════════════════════════════

🎯 HERO-NUMBER VISUAL TYPE DECISION TREE (CRITICAL)
═══════════════════════════════════════════════════════════════════
"""
```

#### Key Sections of System Prompt
1. **Mission Statement**: Educational designer mindset (lines 67-82)
2. **Component Specifications**: Dynamic from `component_schemas.py` (lines 84-87)
3. **Anti-Paragraph Warning**: Prevents lazy component usage (lines 90-119)
4. **Component Selection Guide**: When to use each component (lines 121-224)
5. **Hero-Number Decision Tree**: Visual component logic (lines 226-337)
6. **Text Formatting Rules**: HTML formatting guidelines (lines 340-365)
7. **Transformation Examples**: Before/after scenarios (lines 367-490)
8. **Quality Checklist**: Validation before response (lines 492-525)
9. **Output Format**: JSON structure requirements (lines 527-591)

### PDF Processing Pipeline

#### 1. PDF Upload and Validation (`main.py` upload-pdf endpoint)
```python
# File size and type validation
# Security checks (filename validation, path traversal prevention)
# PDF structure validation using PyMuPDF
# Context length validation (max 1000 chars)
```

#### 2. Image Conversion (`vision_processor.py` convert_pdf_page_to_image)
```python
# Primary: PyMuPDF with resolution matrix scaling
# Fallback: pdf2image with DPI adjustment
# Optimization: Progressive quality reduction for retries
# Memory: Automatic cleanup and garbage collection
```

#### 3. Retry Logic with Progressive Degradation
```python
def _call_vision_api_with_retry(self, pdf_path, page_number, system_prompt, user_prompt):
    for attempt in range(4):  # 4 total attempts
        quality = self.quality_levels[attempt]       # 75→65→50→40
        resolution = self.resolution_matrices[attempt]  # 2.0→1.5→1.2→1.0
        timeout = self._get_page_timeout(page_number)  # Page-specific timeouts

        # Convert with current quality/resolution
        # Make API call with timeout
        # Return success or continue to next attempt
```

#### 4. Batch Processing for Multi-Page PDFs
```python
# Process pages 1 by 1 with memory management
# Garbage collection every 5 pages
# Memory monitoring with psutil (if available)
# Progress callbacks to frontend
# Continue processing if individual pages fail
```

### Component Extraction Workflow

#### 1. Vision API Call Structure
```python
response = self.client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": system_prompt},  # 590-line prompt
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
            ]
        }
    ],
    max_tokens=2000,
    timeout=page_timeout
)
```

#### 2. Response Processing and Validation
```python
# Remove markdown code blocks (```json)
# Parse JSON response
# Validate component sequence structure
# Validate each component against schemas
# Provide fallback for invalid components
```

#### 3. Component Schema Validation
```python
for component in page_result["component_sequence"]:
    component_type = component.get("type")
    parameters = component.get("parameters", {})

    is_valid, error_msg = validate_component_parameters(component_type, parameters)
    if not is_valid:
        # Log validation error and provide fallback
        component["validation_error"] = error_msg
```

### Timeout and Quality Management

#### Dynamic Timeout Calculation
```python
def _get_page_timeout(self, page_number: int) -> int:
    if page_number == 1:
        return int(90 * 1.5)    # 135 seconds for first page
    elif page_number <= 5:
        return int(90 * 1.2)    # 108 seconds for early pages
    else:
        return 90               # 90 seconds for later pages
```

#### Progressive Quality Degradation
```python
# Attempt 1: quality=75, resolution=2.0
# Attempt 2: quality=65, resolution=1.5
# Attempt 3: quality=50, resolution=1.2
# Attempt 4: quality=40, resolution=1.0
```

### Memory Management Patterns

#### Batch Processing Configuration
```python
max_pages_per_batch = 5      # Process 5 pages at a time
max_total_pages = 50         # Limit for memory safety
batch_delay = 0.5           # Delay between batches
```

#### Memory Monitoring and Cleanup
```python
if current_page % self.max_pages_per_batch == 0:
    gc.collect()  # Force garbage collection

    # Monitor memory usage with psutil
    memory_mb = process.memory_info().rss / 1024 / 1024
    if memory_percent > 80:
        # Warning for high memory usage
```

### Error Handling and Recovery

#### Progressive Retry Strategy
1. **Network Timeout**: Retry with same quality/resolution
2. **Rate Limiting**: Exponential backoff (3s → 10s → 30s)
3. **Quality Issues**: Reduce image quality and resolution
4. **Memory Issues**: Force garbage collection, reduce batch size

#### Fallback Response Generation
```python
# For failed pages, generate fallback component
{
    "component_sequence": [{
        "type": "paragraph",
        "order": 1,
        "parameters": {"text": f"Page {page_number} processing failed ({error_type})"},
        "confidence": 0.0
    }],
    "suggested_template": "text-heavy",
    "overall_confidence": 0.0,
    "processing_notes": f"Page failed: {error_message}"
}
```

### Integration with Component System

#### Component Sequence Format
```python
{
    "component_sequence": [
        {
            "type": "heading",
            "order": 1,
            "parameters": {"text": "Understanding Fractions"},
            "confidence": 0.95
        },
        {
            "type": "hero-number",
            "order": 2,
            "parameters": {
                "visual_type": "pie-chart",
                "chart_data": {"numerator": 3, "denominator": 4},
                "visual_content": "",
                "caption": "of students master this concept"
            },
            "confidence": 0.85
        }
    ],
    "suggested_template": "mixed-media",
    "overall_confidence": 0.90,
    "processing_notes": "Extracted heading and statistic, visualized as pie chart"
}
```

#### Database Integration
```python
# Save component sequence to database with validation
success = await db_manager.save_node_components(
    node_id,
    validated_components,
    suggested_template,
    overall_confidence
)
```

### Performance Optimization

#### Image Optimization
```python
def _optimize_image_size(self, image, quality=75, max_dimension=2000):
    # Cap dimensions to prevent huge payloads
    # Progressive compression based on file size
    # Maintain aspect ratio during scaling
    # Log payload size for monitoring
```

#### API Rate Limiting
- Batch delays between page processing
- Exponential backoff on rate limit errors
- Memory cleanup to prevent resource exhaustion

### Frontend Integration

#### Progress Callbacks
```python
def progress_callback(update):
    # Send progress updates to frontend
    # Include status, current_page, total_pages, message
    # Handle warnings (memory, large PDFs)
    # Report completion with error summary
```

#### Async Processing with Threading
```python
# Run vision analysis in background thread
# Collect progress updates in array
# Handle exceptions gracefully
# Return results to main thread
```

### Critical Patterns to Maintain

#### 1. System Prompt Consistency
- Never modify the 590-line prompt structure
- Add new component guidelines following existing patterns
- Maintain educational designer mindset language
- Keep anti-paragraph-spam warnings prominent

#### 2. Component Validation Flow
- Always validate against schemas before database storage
- Provide fallbacks for invalid components
- Log validation errors for debugging
- Maintain confidence scoring

#### 3. Error Recovery
- Continue processing remaining pages on individual failures
- Provide detailed error information in responses
- Use graceful degradation strategies
- Report success/failure statistics

#### 4. Memory Management
- Force garbage collection regularly
- Monitor memory usage and warn on high usage
- Limit total pages for memory safety
- Use batch processing for large documents

This ensures consistent, reliable PDF processing with robust error handling and optimal resource utilization.