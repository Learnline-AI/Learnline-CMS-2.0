#!/usr/bin/env python3

"""
Test script to show what content gets sent to AI for the first node
"""

import sys
import os
sys.path.append('./python-services')

from pdf_extractor import PDFProcessor
import asyncio

async def main():
    print("=== Testing First Node Content Extraction ===\n")

    # Initialize PDF processor
    processor = PDFProcessor()

    # Process the PDF file
    pdf_path = "Class6_Fractions.pdf"
    print(f"Processing PDF: {pdf_path}")

    try:
        result = await processor.process_pdf(pdf_path)

        if result['nodes'] and len(result['nodes']) > 0:
            first_node = result['nodes'][0]

            print(f"\n=== FIRST NODE (Index 0) ===")
            print(f"Node ID: {first_node['node_id']}")
            print(f"Page: {first_node['page_number']}")
            print(f"\n=== CONTENT THAT GETS SENT TO AI ===")
            print("=" * 60)
            print(first_node['content'])
            print("=" * 60)

            # Show what the prompt looks like
            print(f"\n=== AI PROMPT PREVIEW ===")
            print("This content would be sent to OpenAI with the following prompt structure:")
            print("""
Analyze this educational content and extract metadata plus categorize the content.

Content to analyze:
[THE ABOVE CONTENT GETS INSERTED HERE]

Return ONLY a valid JSON object with this exact structure:
{
  "metadata": {
    "pages": "extracted pages information or empty string if not found",
    "textbook_content": "extracted textbook content description or empty string if not found",
    "learning_goals": "extracted learning goals or empty string if not found"
  },
  "categories": [
    {"category": "Explanation", "content": "core concepts and definitions from the text", "confidence": 0.8},
    {"category": "Real World Example", "content": "practical applications and examples from the text", "confidence": 0.9},
    {"category": "Textbook Content", "content": "formal academic material and mathematical notation from the text", "confidence": 0.7},
    {"category": "Memory Trick", "content": "mnemonics, shortcuts, and memory aids from the text", "confidence": 0.6}
  ]
}
            """)

        else:
            print("No nodes found in PDF!")

    except Exception as e:
        print(f"Error processing PDF: {e}")

if __name__ == "__main__":
    asyncio.run(main())