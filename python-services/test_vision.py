#!/usr/bin/env python3

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from vision_processor import VisionProcessor

def test_vision_processing():
    """Test vision processor with First Node Content.pdf"""

    # Initialize vision processor
    vision = VisionProcessor()

    # Path to test PDF
    pdf_path = "../First Node Content.pdf"

    print("🔍 Testing Vision Processor")
    print(f"📄 Processing: {pdf_path}")
    print("-" * 50)

    try:
        # Test just the image conversion first
        print("🔄 Testing PDF to image conversion...")
        image = vision.convert_pdf_page_to_image(pdf_path, page_number=1)
        print(f"✅ Image conversion successful! Size: {image.size}")

        # Now test the full analysis
        print("🔄 Testing vision analysis...")
        result = vision.analyze_pdf_with_vision(pdf_path, page_number=1)

        print("✅ Vision Analysis Complete!")
        print("-" * 50)

        print(f"📝 EXPLANATION:")
        print(result['explanation'])
        print()

        print(f"🌍 REAL WORLD EXAMPLE:")
        print(result['real_world_example'])
        print()

        print(f"📚 TEXTBOOK CONTENT:")
        print(result['textbook_content'])
        print()

        print(f"🧠 MEMORY TRICK:")
        print(result['memory_trick'])
        print()

        print(f"🎨 SUGGESTED TEMPLATE: {result['suggested_template']}")
        print(f"📊 CONFIDENCE SCORE: {result['confidence_score']}")
        print(f"📋 PROCESSING NOTES: {result['processing_notes']}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

    return True

if __name__ == "__main__":
    success = test_vision_processing()
    if success:
        print("\n🎉 Vision processing test completed successfully!")
    else:
        print("\n💥 Vision processing test failed!")