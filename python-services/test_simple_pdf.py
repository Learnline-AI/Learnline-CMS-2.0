#!/usr/bin/env python3

import asyncio
import sys
import os

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pdf_extractor import PDFProcessor

async def test_simple_pdf_processing():
    """Test simple node ID extraction from PDF"""

    processor = PDFProcessor()
    pdf_path = "../First Node Content.pdf"

    print("🔍 Testing Simple PDF Node Scanner")
    print(f"📄 Processing: {pdf_path}")
    print("-" * 50)

    try:
        # Extract node IDs
        node_ids = await processor.process_pdf(pdf_path)

        print("✅ Node Scanning Complete!")
        print("-" * 50)

        if node_ids:
            print(f"📋 Found {len(node_ids)} nodes:")
            for node_id in node_ids:
                print(f"  • {node_id}")
        else:
            print("📋 No nodes found in PDF")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

    return True

if __name__ == "__main__":
    success = asyncio.run(test_simple_pdf_processing())
    if success:
        print("\n🎉 Simple PDF processing test completed!")
    else:
        print("\n💥 Simple PDF processing test failed!")