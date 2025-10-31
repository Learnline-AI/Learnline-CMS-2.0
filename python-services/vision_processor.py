import os
import base64
import io
import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI

logger = logging.getLogger(__name__)
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("Warning: PyMuPDF not available. Using pdf2image fallback.")
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: PIL not available. Image processing will be limited.")
try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    print("Warning: pdf2image not available. PDF processing will be limited.")
from component_schemas import build_component_prompt_section, validate_component_parameters


class VisionProcessor:
    def __init__(self):
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.client = OpenAI(api_key=openai_api_key)
        self.vision_model = 'gpt-4o'
        self.max_image_size = 4000000  # 4MB default

        # PHASE 1: Enhanced Timeout Configuration
        self.base_timeout = 90  # Increased from 30 to 90 seconds base timeout
        self.first_page_timeout_multiplier = 1.5  # First pages get 135 seconds (90 * 1.5)
        self.early_pages_timeout_multiplier = 1.2  # Pages 2-5 get 108 seconds (90 * 1.2)
        self.vision_timeout = self.base_timeout  # Default timeout

        # PHASE 1: Retry Configuration with Exponential Backoff
        self.max_retry_attempts = 4  # Total of 4 attempts (1 initial + 3 retries)
        self.retry_delays = [0, 3, 10, 30]  # Exponential backoff delays in seconds

        # PHASE 2: Progressive Image Quality Degradation
        self.quality_levels = [75, 65, 50, 40]  # Quality decreases with each retry
        self.resolution_matrices = [2.0, 1.5, 1.2, 1.0]  # Resolution scales down with retries
        self.max_dimension = 2000  # Cap image dimensions to 2000px max width/height

        # Batch processing settings for large PDFs
        self.max_pages_per_batch = 5  # Process 5 pages at a time max
        self.max_total_pages = 50     # Limit total pages to prevent memory issues
        self.batch_delay = 0.5        # Delay between batches to prevent API rate limits

        # Build static system prompt with component schemas (done once for efficiency)
        self.component_system_prompt = self._build_enhanced_system_prompt()

    def _build_enhanced_system_prompt(self) -> str:
        """Build comprehensive system prompt with detailed component schemas"""
        component_specs = build_component_prompt_section()

        system_prompt = f"""═══════════════════════════════════════════════════════════════════
MISSION: Educational Math Content Designer
═══════════════════════════════════════════════════════════════════

You are building educational mathematics content for students. You are NOT a photocopier - you are an EDUCATIONAL DESIGNER.

Your task: Transform PDF math content into optimal learning experiences using the component system below.

CRITICAL MINDSET:
• These components are your TEMPLATES - fit content into the RIGHT template for maximum student comprehension
• Don't just replicate what you see in the PDF - IMPROVE it for learning
• If the PDF is boring, make it engaging
• If the PDF is dense, break it into digestible pieces
• If the PDF has plain text data, visualize it
• Think like a teacher designing a lesson, not a scanner copying a page

═══════════════════════════════════════════════════════════════════
AVAILABLE COMPONENT TEMPLATES (Your Building Blocks)
═══════════════════════════════════════════════════════════════════

{component_specs}

═══════════════════════════════════════════════════════════════════
⚠️ ANTI-PARAGRAPH-SPAM WARNING ⚠️
═══════════════════════════════════════════════════════════════════

DO NOT DEFAULT TO PARAGRAPHS FOR EVERYTHING!

I will reject responses that dump all content into paragraph components with strategic bolding.
You have 11 component types - USE THEM STRATEGICALLY.

BAD (lazy, paragraph spam):
[
  {{type: "paragraph", parameters: {{text: "<strong>Definition:</strong> Slope is rise over run. <strong>Formula:</strong> m = (y₂-y₁)/(x₂-x₁). <strong>Example:</strong> Find slope of (1,2) and (3,6)..."}}}}
]

GOOD (proper component variety):
[
  {{type: "heading", parameters: {{text: "Understanding Slope"}}}},
  {{type: "definition", parameters: {{term: "Slope", definition: "The rate of change of a line, calculated as rise over run"}}}},
  {{type: "paragraph", parameters: {{text: "The slope formula is m = (y₂-y₁)/(x₂-x₁) where (x₁,y₁) and (x₂,y₂) are two points on the line."}}}},
  {{type: "worked-example", parameters: {{problem: "Find the slope through (1,2) and (3,6)", solution: "m = (6-2)/(3-1) = 4/2", answer: "m = 2"}}}}
]

CHECKLIST - Ask yourself:
☐ Am I using at least 3+ different component types?
☐ Did I extract tips/warnings into callout-box instead of leaving them in paragraphs?
☐ Did I use definition component for term+meaning pairs instead of bolding in paragraphs?
☐ Did I use worked-example for problem-solution pairs instead of paragraphs?
☐ Did I use step-sequence for procedures instead of numbered lists in paragraphs?
☐ Did I visualize statistics with hero-number instead of plain text?
☐ Did I use heading component for titles instead of bold text in paragraphs?

═══════════════════════════════════════════════════════════════════
DETAILED COMPONENT SELECTION GUIDE (When to Use What)
═══════════════════════════════════════════════════════════════════

🏷️ HEADING
WHEN: Section titles, topic headers, main questions, chapter names
MATH EXAMPLES:
  • "Solving Linear Equations"
  • "The Pythagorean Theorem"
  • "What is a Derivative?"
  • "Practice Problems"
REQUIRED: text
DO NOT USE: For content that belongs in definition or paragraph. Headings are LABELS, not content.

📝 PARAGRAPH
WHEN: Explanatory text, descriptions, conceptual explanations
MATH EXAMPLES:
  • "A linear equation is an algebraic equation where each term is either a constant or the product of a constant and a single variable."
  • "The slope of a line represents how steep the line is. A positive slope rises from left to right, while a negative slope falls."
REQUIRED: text
FORMATTING: Use <strong>key terms</strong> sparingly for inline emphasis ONLY (NOT for titles!)
WARNING: Don't make paragraphs into dumping grounds for everything. Use specialized components!

📖 DEFINITION
WHEN: Term + meaning pairs, vocabulary, mathematical concepts with formal definitions
MATH EXAMPLES:
  • term: "Hypotenuse", definition: "The longest side of a right triangle, opposite the right angle"
  • term: "Coefficient", definition: "A numerical or constant factor in a term of an algebraic expression"
  • term: "Prime Number", definition: "A natural number greater than 1 that has no positive divisors other than 1 and itself"
REQUIRED: term, definition
USE THIS INSTEAD OF: Bolding "Term: definition" in a paragraph

🔢 STEP-SEQUENCE
WHEN: Procedures, algorithms, sequential instructions, "how to" processes, ordered steps
MATH EXAMPLES:
  • How to solve a quadratic equation using the quadratic formula
  • Steps to find the area of a circle
  • Algorithm for long division
  • Process for converting fractions to decimals
REQUIRED: steps (array of strings)
EACH STEP: Should be clear, action-oriented (e.g., "Multiply both sides by the LCD")
USE THIS INSTEAD OF: Numbered lists embedded in paragraphs

✏️ WORKED-EXAMPLE
WHEN: Problem + solution + answer structures, example problems showing work
MATH EXAMPLES:
  • problem: "Solve for x: 2x + 5 = 13"
    solution: "Subtract 5 from both sides: 2x = 8. Divide both sides by 2: x = 4"
    answer: "x = 4"
  • problem: "Find the slope of the line through (1,3) and (4,9)"
    solution: "m = (y₂-y₁)/(x₂-x₁) = (9-3)/(4-1) = 6/3"
    answer: "m = 2"
REQUIRED: problem, solution, answer
ALL THREE FIELDS REQUIRED: Even if solution is brief, provide all three

💡 MEMORY-TRICK
WHEN: Mnemonics, memory aids, tricks for remembering concepts
MATH EXAMPLES:
  • "PEMDAS: Please Excuse My Dear Aunt Sally (order of operations)"
  • "SOH-CAH-TOA for trigonometric ratios"
  • "To remember quadratic formula: negative b, plus or minus the square root, all over 2a"
REQUIRED: text
USE THIS FOR: Quick recall techniques, not general tips

⚠️ CALLOUT-BOX
WHEN: Important notes, warnings, tips, common mistakes, critical insights, "remember this" content
TRIGGERS: Text starting with "Tip:", "Warning:", "Important:", "Remember:", "Note:", "Common Mistake:", "Be Careful:"
MATH EXAMPLES:
  • "Warning: When multiplying inequalities by a negative number, flip the inequality sign!"
  • "Common Mistake: Students often forget that division by zero is undefined"
  • "Remember: The order of operations matters - multiplication doesn't always come before division!"
REQUIRED: text, style (optional but recommended)
STYLE OPTIONS:
  • "tip" → helpful hints
  • "warning" → common mistakes, pitfalls to avoid
  • "important" → critical concepts students must know
  • "info" → general notes
USE THIS INSTEAD OF: Leaving tips/warnings embedded in regular paragraphs

🎯 HERO-NUMBER (DETAILED - READ CAREFULLY)
WHEN: Statistics, data points, percentages, ratios, impressive numbers that deserve visual emphasis
ACTIVE SCANNING: Look for ANY quantitative data and ask "Should this be visualized?"
SEE FULL DECISION TREE BELOW ↓

🖼️ PICTURE COMPONENTS (four-pictures, three-pictures, two-pictures)
WHEN: Diagrams, illustrations, graphs, visual representations with IMAGE uploads
MATH EXAMPLES:
  • Coordinate plane graphs
  • Geometric shapes
  • Function visualizations
  • Number line representations
REQUIRED: pictures object with image1, image2, etc. (each with title, body, imagePath)
NOTE: Use these when PDF has actual images/diagrams to display

🎨 THREE-SVGS (AI-Generated Illustrations)
WHEN: Conceptual diagrams, icons, geometric illustrations, charts, educational graphics
MATH EXAMPLES:
  • Clock faces showing time fractions
  • Geometric shape comparisons
  • Visual concept representations
  • Abstract mathematical ideas that need simple illustrations
REQUIRED: title1-3, description1-3 (SVG code auto-generated by AI)
USE THIS INSTEAD OF: three-pictures when you need AI-generated diagrams vs photo uploads
TRIGGER: Ask "Can this be illustrated with simple shapes/diagrams rather than photos?"

═══════════════════════════════════════════════════════════════════
🎯 HERO-NUMBER VISUAL TYPE DECISION TREE (CRITICAL)
═══════════════════════════════════════════════════════════════════

This is one of your MOST POWERFUL components for making math engaging.
Actively scan for quantitative data and visualize it!

DECISION LOGIC:

📊 CASE 1: Part-of-Whole Relationship?
TRIGGERS: Fractions, ratios, percentages showing "X out of Y" or "X/Y" relationships
MATH EXAMPLES:
  • "3/4" or "3 out of 4"
  • "75%" or "0.75"
  • "2:3 ratio"
  • "5 out of 8 students"
  • "87% accuracy rate"
COMPONENT:
{{
  "type": "hero-number",
  "parameters": {{
    "visual_type": "pie-chart",
    "chart_data": {{"numerator": 3, "denominator": 4}},
    "visual_content": "",
    "caption": "of students mastered this concept",
    "background_style": "purple"
  }}
}}
CRITICAL:
  • chart_data is REQUIRED with numerator and denominator
  • visual_content stays EMPTY (frontend auto-generates SVG pie chart)
  • For percentages: convert to fraction (75% = 75/100)

📈 CASE 2: Progress or Completion Metric?
TRIGGERS: "Completed X of Y", "Solved X out of Y problems", goal tracking
MATH EXAMPLES:
  • "Completed 45 out of 60 practice problems"
  • "Solved 75 out of 100 questions correctly"
  • "Mastered 12 of 20 concepts"
  • "Progress: 450/600"
COMPONENT:
{{
  "type": "hero-number",
  "parameters": {{
    "visual_type": "bar-chart",
    "chart_data": {{"current": 45, "maximum": 60}},
    "visual_content": "",
    "caption": "practice problems completed",
    "background_style": "blue"
  }}
}}
CRITICAL:
  • chart_data is REQUIRED with current and maximum
  • visual_content stays EMPTY (frontend auto-generates SVG bar chart)
  • Shows progress visually as a bar

🔢 CASE 3: Standalone Number or Statistic?
TRIGGERS: Single impressive numbers, mathematical constants, means/medians, large numbers
MATH EXAMPLES:
  • "Mean = 85.3"
  • "π ≈ 3.14159"
  • "1,024 possible combinations"
  • "$500 total"
  • "Standard deviation: 12.5"
COMPONENT:
{{
  "type": "hero-number",
  "parameters": {{
    "visual_type": "text",
    "visual_content": "π ≈ 3.14159",
    "caption": "ratio of circumference to diameter",
    "background_style": "green"
  }}
}}
CRITICAL:
  • visual_content contains the actual number/text
  • chart_data is NOT needed for text type
  • Use for focal statistics that don't need charts

🎨 CASE 4: Visual Fraction Diagram in PDF?
TRIGGERS: PDF shows circles/shapes with shading to represent fractions
MATH EXAMPLES:
  • Circle divided into 4 parts with 3 shaded
  • Multiple circles showing fraction equivalents
  • Visual fraction models
COMPONENT:
{{
  "type": "hero-number",
  "parameters": {{
    "visual_type": "fraction-circle",
    "chart_data": {{"numerator": 3, "denominator": 4}},
    "visual_content": "",
    "caption": "three fourths",
    "background_style": "orange"
  }}
}}
CRITICAL:
  • chart_data is REQUIRED
  • Frontend generates multiple circles with appropriate shading
  • Use when PDF explicitly shows fraction circle diagrams

BACKGROUND_STYLE OPTIONS:
  • "purple" (default) - general use
  • "blue" - progress/growth
  • "green" - success/positive
  • "orange" - attention/focus
  • "red" - warning/critical
  • "dark" - emphasis
  • "light" - subtle

REMEMBER: The frontend has POWERFUL SVG auto-generation.
When you provide chart_data, beautiful animated charts are created automatically.
NEVER write SVG code yourself - just provide the data!

═══════════════════════════════════════════════════════════════════
TEXT FORMATTING RULES (For Paragraph Components Only)
═══════════════════════════════════════════════════════════════════

Use HTML formatting SPARINGLY and ONLY within paragraph text:

<strong>term</strong>
  • Purpose: Inline emphasis of KEY mathematical terms
  • Example: "The <strong>hypotenuse</strong> is the longest side"
  • DO NOT use for: Titles, headings, entire sentences
  • Frequency: 1-3 terms per paragraph maximum

<em>text</em>
  • Purpose: Mild emphasis, rarely needed
  • Use sparingly

<span style="color:#1976D2">critical concept</span>
  • Purpose: Concepts students MUST remember
  • Example: "Remember: <span style="color:#1976D2">division by zero is undefined</span>"

<span style="color:#388E3C">example text</span>
  • Purpose: Examples or positive outcomes
  • Use rarely

GOLDEN RULE: 90% of your text should be PLAIN.
Only format what TRULY needs highlighting.

═══════════════════════════════════════════════════════════════════
TRANSFORMATION EXAMPLES (How to Think Like a Designer)
═══════════════════════════════════════════════════════════════════

SCENARIO 1: Statistics in Plain Text
❌ PDF SHOWS:
"Studies show that 87% of students who practice daily improve their test scores significantly."

✅ YOU SHOULD SUGGEST:
[
  {{
    "type": "hero-number",
    "order": 1,
    "parameters": {{
      "visual_type": "pie-chart",
      "chart_data": {{"numerator": 87, "denominator": 100}},
      "visual_content": "",
      "caption": "of students improve with daily practice"
    }},
    "confidence": 0.9
  }},
  {{
    "type": "paragraph",
    "order": 2,
    "parameters": {{"text": "Daily practice leads to significant test score improvements."}},
    "confidence": 0.85
  }}
]

SCENARIO 2: Embedded Tip in Dense Paragraph
❌ PDF SHOWS:
"When solving linear equations, always remember to perform the same operation on both sides to maintain equality. This is crucial for getting the correct answer."

✅ YOU SHOULD SUGGEST:
[
  {{
    "type": "callout-box",
    "order": 1,
    "parameters": {{
      "text": "Remember: Perform the same operation on both sides to maintain equality",
      "style": "important"
    }},
    "confidence": 0.95
  }}
]

SCENARIO 3: Multiple Concepts Crammed in One Paragraph
❌ PDF SHOWS:
"The Distributive Property. The distributive property states that a(b + c) = ab + ac. For example, to solve 3(x + 2), we distribute: 3·x + 3·2 = 3x + 6."

✅ YOU SHOULD SUGGEST:
[
  {{
    "type": "heading",
    "order": 1,
    "parameters": {{"text": "The Distributive Property"}},
    "confidence": 1.0
  }},
  {{
    "type": "definition",
    "order": 2,
    "parameters": {{
      "term": "Distributive Property",
      "definition": "A mathematical property stating that a(b + c) = ab + ac"
    }},
    "confidence": 0.95
  }},
  {{
    "type": "worked-example",
    "order": 3,
    "parameters": {{
      "problem": "Simplify 3(x + 2)",
      "solution": "Apply distributive property: 3·x + 3·2",
      "answer": "3x + 6"
    }},
    "confidence": 0.9
  }}
]

SCENARIO 4: Numbered Steps in Paragraph
❌ PDF SHOWS:
"To find the area of a triangle: 1) Identify the base length 2) Identify the height 3) Multiply base × height 4) Divide by 2"

✅ YOU SHOULD SUGGEST:
[
  {{
    "type": "heading",
    "order": 1,
    "parameters": {{"text": "Finding the Area of a Triangle"}},
    "confidence": 1.0
  }},
  {{
    "type": "step-sequence",
    "order": 2,
    "parameters": {{
      "steps": [
        "Identify the base length of the triangle",
        "Identify the perpendicular height",
        "Multiply base × height",
        "Divide the result by 2"
      ]
    }},
    "confidence": 0.95
  }}
]

SCENARIO 5: Progress Metric in Text
❌ PDF SHOWS:
"Complete 45 out of 60 practice problems to achieve mastery of this concept."

✅ YOU SHOULD SUGGEST:
[
  {{
    "type": "hero-number",
    "order": 1,
    "parameters": {{
      "visual_type": "bar-chart",
      "chart_data": {{"current": 45, "maximum": 60}},
      "visual_content": "",
      "caption": "practice problems needed for mastery"
    }},
    "confidence": 0.9
  }}
]

═══════════════════════════════════════════════════════════════════
FINAL QUALITY CHECKLIST (Before Returning Response)
═══════════════════════════════════════════════════════════════════

Before you finalize your component sequence, verify:

☑️ COMPONENT VARIETY
   • Using at least 3 different component types?
   • Not dumping everything into paragraphs?
   • Extracted definitions into definition components?
   • Extracted tips/warnings into callout-box components?
   • Extracted procedures into step-sequence components?

☑️ HERO-NUMBER OPPORTUNITIES
   • Scanned for ALL quantitative data?
   • Visualized statistics with pie-chart/bar-chart?
   • Used chart_data correctly with required parameters?
   • Left visual_content EMPTY for chart types?

☑️ STRUCTURE OVER FORMATTING
   • Used heading component for titles (not bold text in paragraphs)?
   • Broke dense content into multiple components?
   • Each component has a clear, focused purpose?

☑️ FORMATTING DISCIPLINE
   • Used <strong> only for inline term emphasis?
   • Kept formatting minimal (90% plain text)?
   • No entire sentences bolded?

☑️ REQUIRED PARAMETERS
   • All components have required parameters filled?
   • worked-example has problem, solution, AND answer?
   • step-sequence uses array format for steps?
   • hero-number has correct chart_data structure?

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON Structure)
═══════════════════════════════════════════════════════════════════

Return ONLY valid JSON with this EXACT structure:

{{
  "component_sequence": [
    {{
      "type": "heading",
      "order": 1,
      "parameters": {{"text": "Solving Linear Equations"}},
      "confidence": 0.95
    }},
    {{
      "type": "definition",
      "order": 2,
      "parameters": {{
        "term": "Linear Equation",
        "definition": "An equation where the highest power of the variable is 1"
      }},
      "confidence": 0.9
    }},
    {{
      "type": "hero-number",
      "order": 3,
      "parameters": {{
        "visual_type": "pie-chart",
        "chart_data": {{"numerator": 85, "denominator": 100}},
        "visual_content": "",
        "caption": "of students master this with practice"
      }},
      "confidence": 0.85
    }}
  ],
  "suggested_template": "text-heavy",
  "overall_confidence": 0.90,
  "processing_notes": "Identified title, key definition, and success statistic. Used heading, definition, and hero-number components for clear structure. Visualized percentage as pie chart."
}}

REQUIRED FIELDS:
• component_sequence: Array of component objects
• suggested_template: One of the valid templates (see below)
• overall_confidence: Number between 0 and 1
• processing_notes: Brief explanation of your analysis and decisions

VALID TEMPLATE OPTIONS:
• "text-heavy" - Primarily explanatory text, minimal visuals
• "visual-grid" - Multiple diagrams, images, visual examples
• "highlight-box" - Emphasized content, callouts, key concepts
• "mixed-media" - Combination of text and visual elements
• "simple-list" - Sequential steps, structured lists, procedures

TEMPLATE SELECTION GUIDE:
→ text-heavy: Page is mostly paragraphs and definitions
→ visual-grid: Page has multiple images or diagrams
→ highlight-box: Page has important callouts or emphasis blocks
→ mixed-media: Page balances text explanations with some visuals
→ simple-list: Page is primarily step-by-step or numbered content

═══════════════════════════════════════════════════════════════════
REMEMBER: You are an EDUCATIONAL DESIGNER, not a photocopier.
Transform the PDF into the BEST possible learning experience.
Use component variety. Visualize data. Structure properly.
Make math engaging for students!
═══════════════════════════════════════════════════════════════════"""

        return system_prompt

    def _get_page_timeout(self, page_number: int) -> int:
        """Calculate timeout for specific page number (Phase 1)"""
        if page_number == 1:
            # First page gets longest timeout (title pages are complex)
            return int(self.base_timeout * self.first_page_timeout_multiplier)
        elif page_number <= 5:
            # Early pages get moderate timeout
            return int(self.base_timeout * self.early_pages_timeout_multiplier)
        else:
            # Later pages use base timeout
            return self.base_timeout

    def _call_vision_api_with_retry(self, pdf_path: str, page_number: int, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Call vision API with retry logic and progressive quality degradation (Phase 1 & 2)

        Implements:
        - Exponential backoff retries
        - Progressive image quality reduction
        - Progressive resolution reduction
        - Detailed logging for debugging
        """
        import time

        last_error = None
        page_timeout = self._get_page_timeout(page_number)

        for attempt in range(self.max_retry_attempts):
            try:
                # PHASE 2: Get quality and resolution for this attempt
                quality = self.quality_levels[attempt]
                resolution_matrix = self.resolution_matrices[attempt]

                logger.info(f"Vision API attempt {attempt + 1}/{self.max_retry_attempts} for page {page_number}")
                logger.info(f"Using quality={quality}, resolution={resolution_matrix}, timeout={page_timeout}s")

                # Convert PDF page to image with progressive quality/resolution
                image, _ = self.convert_pdf_page_to_image(
                    pdf_path,
                    page_number,
                    resolution_matrix=resolution_matrix,
                    quality=quality
                )

                # Encode to base64 with quality setting
                base64_image = self._encode_image_to_base64(image, quality=quality)

                # Make vision API call with timeout
                response = self.client.chat.completions.create(
                    model=self.vision_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
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

                # Success! Parse and return response
                logger.info(f"Vision API call successful on attempt {attempt + 1}")
                result_text = response.choices[0].message.content.strip()

                # Remove markdown code blocks if present
                if result_text.startswith('```json'):
                    result_text = result_text[7:]
                if result_text.endswith('```'):
                    result_text = result_text[:-3]
                result_text = result_text.strip()

                return json.loads(result_text)

            except Exception as e:
                last_error = e
                error_type = type(e).__name__
                logger.warning(f"Attempt {attempt + 1} failed with {error_type}: {str(e)}")

                # If this wasn't the last attempt, wait before retrying
                if attempt < self.max_retry_attempts - 1:
                    delay = self.retry_delays[attempt + 1]
                    logger.info(f"Waiting {delay}s before retry (will use lower quality/resolution)...")
                    time.sleep(delay)
                else:
                    # Last attempt failed
                    logger.error(f"All {self.max_retry_attempts} attempts failed for page {page_number}")

        # All retries exhausted, raise the last error
        raise last_error

    def _merge_page_responses(self, page_responses: list) -> Dict[str, Any]:
        """Merge multiple page analysis responses into single unified response"""
        if not page_responses:
            return {
                "component_sequence": [],
                "suggested_template": "text-heavy",
                "overall_confidence": 0.0,
                "processing_notes": "No pages to process"
            }
        
        if len(page_responses) == 1:
            return page_responses[0]
        
        # Merge component sequences from all pages
        merged_components = []
        order_counter = 1
        
        for page_response in page_responses:
            page_components = page_response.get("component_sequence", [])
            for component in page_components:
                component["order"] = order_counter
                merged_components.append(component)
                order_counter += 1
        
        # Calculate average confidence
        confidences = [resp.get("overall_confidence", 0.0) for resp in page_responses]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Select most common template suggestion
        templates = [resp.get("suggested_template", "text-heavy") for resp in page_responses]
        template_counts = {}
        for template in templates:
            template_counts[template] = template_counts.get(template, 0) + 1
        best_template = max(template_counts, key=template_counts.get) if template_counts else "text-heavy"
        
        # Combine processing notes
        notes = [resp.get("processing_notes", "") for resp in page_responses]
        combined_notes = f"Analyzed {len(page_responses)} pages, merged {len(merged_components)} components"
        
        return {
            "component_sequence": merged_components,
            "suggested_template": best_template,
            "overall_confidence": avg_confidence,
            "processing_notes": combined_notes
        }

    def _encode_image_to_base64(self, image, quality: int = 75) -> str:
        """Convert PIL Image to base64 string for API (Phase 2: quality parameter added)"""
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality)
        image_bytes = buffer.getvalue()

        # PHASE 2: Log payload size for monitoring
        size_kb = len(image_bytes) / 1024
        size_mb = size_kb / 1024
        logger.info(f"Image payload size: {size_mb:.2f}MB (quality={quality})")

        if size_mb > 15:  # Warning threshold
            logger.warning(f"Large image payload detected: {size_mb:.2f}MB - this may cause timeout")

        return base64.b64encode(image_bytes).decode('utf-8')

    def _optimize_image_size(self, image, quality: int = 75, max_dimension: int = None):
        """Resize image if too large for API limits (Phase 2: enhanced compression)"""
        if max_dimension is None:
            max_dimension = self.max_dimension

        width, height = image.size
        logger.info(f"Original image dimensions: {width}x{height}")

        # PHASE 2: Cap dimensions to prevent huge payloads
        if width > max_dimension or height > max_dimension:
            # Calculate scaling factor to fit within max_dimension
            scale = min(max_dimension / width, max_dimension / height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            logger.info(f"Capping dimensions to: {new_width}x{new_height}")
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Check if further compression needed based on file size
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality)

        if len(buffer.getvalue()) > self.max_image_size:
            # Reduce size by 75% if still too large
            width, height = image.size
            new_size = (int(width * 0.75), int(height * 0.75))
            logger.info(f"Image still too large, reducing to: {new_size}")
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        return image

    def convert_pdf_page_to_image(self, pdf_path: str, page_number: int = 1, resolution_matrix: float = 2.0, quality: int = 75):
        """Convert specific PDF page to PIL Image using PyMuPDF or pdf2image fallback (Phase 2: added resolution/quality params)"""
        if not PIL_AVAILABLE:
            raise Exception("PIL not available. Cannot process images.")

        # Try PyMuPDF first (preferred method)
        if PYMUPDF_AVAILABLE:
            try:
                doc = fitz.open(pdf_path)
                total_pages = len(doc)

                if page_number < 1 or page_number > total_pages:
                    raise ValueError(f"Page {page_number} not found. PDF has {total_pages} pages.")

                page = doc.load_page(page_number - 1)
                # PHASE 2: Use parameterized resolution matrix instead of hardcoded 2.0
                mat = fitz.Matrix(resolution_matrix, resolution_matrix)
                logger.info(f"Converting page {page_number} with resolution matrix: {resolution_matrix}")
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("ppm")
                image = Image.open(io.BytesIO(img_data))
                doc.close()

                # PHASE 2: Pass quality parameter to optimization
                optimized_image = self._optimize_image_size(image, quality=quality)
                return optimized_image, total_pages

            except Exception as e:
                raise Exception(f"PDF to image conversion failed: {str(e)}")

        # Fallback to pdf2image if PyMuPDF not available
        elif PDF2IMAGE_AVAILABLE:
            try:
                # PHASE 2: Adjust DPI based on resolution_matrix
                dpi = int(150 * (resolution_matrix / 2.0))  # Scale DPI proportionally
                logger.info(f"Converting page {page_number} with DPI: {dpi}")

                # Convert specific page
                images = convert_from_path(pdf_path, first_page=page_number, last_page=page_number, dpi=dpi)

                if not images:
                    raise ValueError(f"Could not convert page {page_number}")

                image = images[0]

                # Get total page count
                all_images = convert_from_path(pdf_path, dpi=72)
                total_pages = len(all_images)

                # PHASE 2: Pass quality parameter to optimization
                optimized_image = self._optimize_image_size(image, quality=quality)
                return optimized_image, total_pages

            except Exception as e:
                raise Exception(f"PDF to image conversion failed: {str(e)}")

        else:
            raise Exception("No PDF processing library available. Install PyMuPDF or pdf2image with poppler.")

    def analyze_pdf_with_vision(self, pdf_path: str, page_number: int = 1, context: Optional[str] = None) -> Dict[str, Any]:
        """Analyze PDF page with vision AI to extract categorized educational content (legacy format)"""
        return self._analyze_with_legacy_format(pdf_path, page_number, context)

    def _analyze_with_legacy_format(self, pdf_path: str, page_number: int = 1, context: Optional[str] = None) -> Dict[str, Any]:
        """Legacy method for 4-category content extraction"""
        try:
            # Convert PDF page to image
            image, _ = self.convert_pdf_page_to_image(pdf_path, page_number)
            base64_image = self._encode_image_to_base64(image)

            # Construct vision prompt
            system_prompt = """You are analyzing educational content for an AI-powered CMS. Extract content and categorize it into exactly 4 types:

1. EXPLANATION: Core concept explanations, definitions, theoretical content
2. REAL_WORLD_EXAMPLE: Practical applications, real-life scenarios, concrete examples
3. TEXTBOOK_CONTENT: Formal academic material, formulas, structured information
4. MEMORY_TRICK: Mnemonics, memory aids, quick recall techniques

Also suggest the best template based on visual layout:
- text-heavy: Dense text, minimal formatting
- visual-grid: Images, diagrams, multi-column layout
- highlight-box: Emphasized content, callouts, important points
- mixed-media: Combination of text and visual elements
- simple-list: Sequential steps, bullet points, structured lists

Return ONLY valid JSON with this exact structure:
{
    "explanation": "extracted explanation content",
    "real_world_example": "extracted example content",
    "textbook_content": "extracted formal content",
    "memory_trick": "extracted memory aid content",
    "suggested_template": "template_name",
    "confidence_score": 0.85,
    "processing_notes": "brief analysis notes"
}"""

            user_prompt = f"Analyze this educational content page and extract the 4 categories. {f'Context: {context}' if context else ''}"

            # Make vision API call
            response = self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                        ]
                    }
                ],
                max_tokens=1500,
                timeout=self.vision_timeout
            )

            # Parse response
            result_text = response.choices[0].message.content.strip()

            # Remove markdown code blocks if present
            if result_text.startswith('```json'):
                result_text = result_text[7:]  # Remove ```json
            if result_text.endswith('```'):
                result_text = result_text[:-3]  # Remove ```
            result_text = result_text.strip()

            result = json.loads(result_text)

            # Validate required fields
            required_fields = ["explanation", "real_world_example", "textbook_content", "memory_trick", "suggested_template"]
            for field in required_fields:
                if field not in result:
                    result[field] = f"No {field.replace('_', ' ')} found in content"

            if "confidence_score" not in result:
                result["confidence_score"] = 0.5

            if "processing_notes" not in result:
                result["processing_notes"] = "Vision analysis completed"

            return result

        except json.JSONDecodeError as e:
            return {
                "explanation": "Error parsing vision response",
                "real_world_example": "Content extraction failed",
                "textbook_content": "Vision processing error",
                "memory_trick": "Unable to process content",
                "suggested_template": "text-heavy",
                "confidence_score": 0.0,
                "processing_notes": f"JSON parsing error: {str(e)}"
            }

        except Exception as e:
            return {
                "explanation": "Vision analysis failed",
                "real_world_example": "Unable to process PDF",
                "textbook_content": "Content extraction error",
                "memory_trick": "Processing failed",
                "suggested_template": "text-heavy",
                "confidence_score": 0.0,
                "processing_notes": f"Vision error: {str(e)}"
            }

    def analyze_pdf_for_components(self, pdf_path: str, page_number: int = 1, context: Optional[str] = None, progress_callback: Optional[callable] = None) -> Dict[str, Any]:
        """Analyze PDF with vision AI to generate component sequence suggestions for all pages"""
        logger.info(f"Starting analyze_pdf_for_components for: {pdf_path}")
        try:
            # Get total page count first
            logger.info("Getting total page count...")
            _, total_pages = self.convert_pdf_page_to_image(pdf_path, 1)
            logger.info(f"Processing PDF with {total_pages} pages")
            
            # Limit total pages for memory management
            if total_pages > self.max_total_pages:
                print(f"Warning: PDF has {total_pages} pages, limiting to {self.max_total_pages} for memory safety")
                total_pages = self.max_total_pages
                if progress_callback:
                    progress_callback({
                        "status": "warning",
                        "current_page": 0,
                        "total_pages": total_pages,
                        "message": f"Large PDF detected - processing first {total_pages} pages only"
                    })
            
            # Send initial progress update
            if progress_callback:
                progress_callback({
                    "status": "started",
                    "current_page": 0,
                    "total_pages": total_pages,
                    "message": f"Starting analysis of {total_pages} pages"
                })
            
            # Process pages in batches for memory management
            page_responses = []
            failed_pages = []  # Track pages that failed processing

            logger.info("Importing dependencies for batch processing...")
            import time
            import gc
            try:
                import psutil
                psutil_available = True
            except ImportError:
                logger.warning("psutil not available - memory monitoring disabled")
                psutil_available = False
            import os
            
            for current_page in range(1, total_pages + 1):
                print(f"Processing page {current_page} of {total_pages}")
                
                # Batch processing: monitor memory and force cleanup
                if current_page % self.max_pages_per_batch == 0:
                    gc.collect()  # Force garbage collection to free memory

                    # Monitor memory usage if psutil is available
                    if psutil_available:
                        try:
                            process = psutil.Process(os.getpid())
                            memory_mb = process.memory_info().rss / 1024 / 1024
                            memory_percent = process.memory_percent()

                            if progress_callback:
                                progress_callback({
                                    "status": "batch_cleanup",
                                    "current_page": current_page,
                                    "total_pages": total_pages,
                                    "memory_usage_mb": round(memory_mb, 1),
                                    "memory_percent": round(memory_percent, 1),
                                    "message": f"Memory cleanup: {memory_mb:.1f}MB used ({memory_percent:.1f}%)"
                                })

                            # Warning if memory usage is high
                            if memory_percent > 80:
                                if progress_callback:
                                    progress_callback({
                                        "status": "memory_warning",
                                        "current_page": current_page,
                                        "total_pages": total_pages,
                                        "message": f"High memory usage detected: {memory_percent:.1f}%"
                                    })
                        except Exception as mem_error:
                            logger.warning(f"Memory monitoring error: {mem_error}")
                    
                    time.sleep(self.batch_delay)  # Brief delay to prevent API rate limits
                
                # Send progress update for current page
                if progress_callback:
                    progress_callback({
                        "status": "processing",
                        "current_page": current_page,
                        "total_pages": total_pages,
                        "message": f"Processing page {current_page} of {total_pages}"
                    })
                
                try:
                    # PHASE 1 & 2: Use retry wrapper with progressive degradation
                    # Use cached system prompt with detailed component schemas
                    system_prompt = self.component_system_prompt
                    user_prompt = f"Analyze this educational content page and suggest the optimal component sequence to recreate it. Focus on the visual layout and content structure. {f'Context: {context}' if context else ''}"

                    # Call vision API with automatic retry, timeout scaling, and quality degradation
                    logger.info(f"Calling vision API with retry logic for page {current_page}...")
                    page_result = self._call_vision_api_with_retry(
                        pdf_path=pdf_path,
                        page_number=current_page,
                        system_prompt=system_prompt,
                        user_prompt=user_prompt
                    )

                    # Validate component sequence structure and parameters
                    if "component_sequence" not in page_result:
                        page_result["component_sequence"] = [{
                            "type": "paragraph",
                            "order": 1,
                            "parameters": {"text": f"Unable to analyze page {current_page} content structure"},
                            "confidence": 0.1
                        }]

                    # Validate each component against schemas
                    validated_components = []
                    for component in page_result["component_sequence"]:
                        component_type = component.get("type")
                        parameters = component.get("parameters", {})

                        is_valid, error_msg = validate_component_parameters(component_type, parameters)
                        if is_valid:
                            validated_components.append(component)
                        else:
                            # Log validation error and provide fallback
                            print(f"Page {current_page} component validation failed: {error_msg}")
                            # Keep component but note validation issue
                            component["validation_error"] = error_msg
                            validated_components.append(component)

                    page_result["component_sequence"] = validated_components

                    if "suggested_template" not in page_result:
                        page_result["suggested_template"] = "text-heavy"

                    if "overall_confidence" not in page_result:
                        page_result["overall_confidence"] = 0.3

                    if "processing_notes" not in page_result:
                        page_result["processing_notes"] = f"Component sequence analysis completed for page {current_page}"

                    page_responses.append(page_result)

                    # Memory cleanup happens inside _call_vision_api_with_retry method
                    
                    # Send page completion progress update
                    if progress_callback:
                        progress_callback({
                            "status": "page_completed",
                            "current_page": current_page,
                            "total_pages": total_pages,
                            "message": f"Completed page {current_page} of {total_pages}"
                        })
                    
                except Exception as page_error:
                    logger.error(f"Error processing page {current_page}: {str(page_error)}")
                    logger.error(f"Full traceback:", exc_info=True)
                    failed_pages.append(current_page)
                    
                    # Send error progress update
                    if progress_callback:
                        progress_callback({
                            "status": "page_error",
                            "current_page": current_page,
                            "total_pages": total_pages,
                            "message": f"Page {current_page} failed - continuing with remaining pages"
                        })
                    
                    # Add fallback response for failed page with detailed error info
                    error_type = type(page_error).__name__
                    page_responses.append({
                        "component_sequence": [{
                            "type": "paragraph",
                            "order": 1,
                            "parameters": {"text": f"Page {current_page} processing failed ({error_type})"},
                            "confidence": 0.0
                        }],
                        "suggested_template": "text-heavy",
                        "overall_confidence": 0.0,
                        "processing_notes": f"Page {current_page} failed: {error_type} - {str(page_error)[:100]}",
                        "error_info": {
                            "page_number": current_page,
                            "error_type": error_type,
                            "error_message": str(page_error)
                        }
                    })
                    
                    # Continue processing remaining pages instead of stopping
            
            # Send final completion progress update with error summary
            successful_pages = total_pages - len(failed_pages)
            if progress_callback:
                if failed_pages:
                    message = f"Analysis completed - {successful_pages}/{total_pages} pages successful (pages {failed_pages} had errors)"
                    progress_callback({
                        "status": "completed_with_errors",
                        "current_page": total_pages,
                        "total_pages": total_pages,
                        "successful_pages": successful_pages,
                        "failed_pages": failed_pages,
                        "message": message
                    })
                else:
                    progress_callback({
                        "status": "completed",
                        "current_page": total_pages,
                        "total_pages": total_pages,
                        "message": f"Analysis completed - processed {total_pages} pages successfully"
                    })
            
            # Merge all page responses into single result
            merged_result = self._merge_page_responses(page_responses)
            
            # Add error summary to final result
            if failed_pages:
                merged_result["error_summary"] = {
                    "total_pages": total_pages,
                    "successful_pages": successful_pages,
                    "failed_pages": failed_pages,
                    "success_rate": f"{(successful_pages/total_pages)*100:.1f}%"
                }
                merged_result["processing_notes"] += f" | {len(failed_pages)} pages had errors"
            
            return merged_result

        except json.JSONDecodeError as e:
            return {
                "component_sequence": [{
                    "type": "paragraph",
                    "order": 1,
                    "parameters": {"text": "Error parsing vision response"},
                    "confidence": 0.0
                }],
                "suggested_template": "text-heavy",
                "overall_confidence": 0.0,
                "processing_notes": f"JSON parsing error: {str(e)}"
            }

        except Exception as e:
            return {
                "component_sequence": [{
                    "type": "paragraph",
                    "order": 1,
                    "parameters": {"text": "Vision analysis failed"},
                    "confidence": 0.0
                }],
                "suggested_template": "text-heavy",
                "overall_confidence": 0.0,
                "processing_notes": f"Vision error: {str(e)}"
            }