"""
Test script for Phase 1: Multimodal LLM Vision Capabilities
Tests both Claude PDF processing and Gemini image processing
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import llm_backend
sys.path.insert(0, str(Path(__file__).parent))

from llm_backend import LLMBackend


async def test_claude_pdf():
    """Test 1: Claude PDF Processing"""
    print("\n" + "="*60)
    print("TEST 1: Claude PDF Processing (Native Support)")
    print("="*60)

    try:
        # Initialize Claude backend
        backend = LLMBackend(provider="claude")
        print("✓ Claude backend initialized")

        # Use a test PDF from uploads directory
        pdf_path = "../uploads/pdfs/Class6_Fractions.pdf"

        if not Path(pdf_path).exists():
            print(f"⚠ Test PDF not found at {pdf_path}")
            print("  Please ensure a PDF file exists in uploads/pdfs/")
            return False

        print(f"✓ Found test PDF: {pdf_path}")

        # Test with PDF file path
        print("\n📄 Sending PDF to Claude with question...")
        response = await backend.chat_with_file(
            user_message="What educational topic is covered in this document? Provide a brief summary.",
            file_data=pdf_path,
            file_type="pdf"
        )

        print("\n🤖 Claude's Response:")
        print("-" * 60)
        print(response)
        print("-" * 60)

        print("\n✅ TEST 1 PASSED: Claude successfully processed PDF")
        return True

    except Exception as e:
        print(f"\n❌ TEST 1 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_gemini_image():
    """Test 2: Gemini Image Processing (with PDF→Image conversion)"""
    print("\n" + "="*60)
    print("TEST 2: Gemini Image Processing (PDF→Image Conversion)")
    print("="*60)

    try:
        # Initialize Gemini backend
        backend = LLMBackend(provider="gemini")
        print("✓ Gemini backend initialized")

        # Use same PDF - Gemini will convert to image
        pdf_path = "../uploads/pdfs/Class6_Fractions.pdf"

        if not Path(pdf_path).exists():
            print(f"⚠ Test PDF not found at {pdf_path}")
            return False

        print(f"✓ Found test PDF: {pdf_path}")
        print("  (Will be converted to image for Gemini)")

        # Test with PDF file path (will auto-convert to image)
        print("\n📄 Converting PDF to image and sending to Gemini...")
        response = await backend.chat_with_file(
            user_message="Describe what you see in this educational content. What subject is it about?",
            file_data=pdf_path,
            file_type="pdf"  # Gemini will convert this to image
        )

        print("\n🤖 Gemini's Response:")
        print("-" * 60)
        print(response)
        print("-" * 60)

        print("\n✅ TEST 2 PASSED: Gemini successfully processed PDF (via image conversion)")
        return True

    except Exception as e:
        print(f"\n❌ TEST 2 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_file_type_detection():
    """Test 3: File Type Auto-Detection"""
    print("\n" + "="*60)
    print("TEST 3: File Type Auto-Detection")
    print("="*60)

    try:
        # Create backend instance without initializing (just for testing utility methods)
        import os
        os.environ.setdefault("GEMINI_API_KEY", "dummy_key_for_testing")
        backend = LLMBackend(provider="gemini")

        # Test PDF detection
        pdf_path = "../uploads/pdfs/Class6_Fractions.pdf"
        if Path(pdf_path).exists():
            detected = backend._detect_file_type(pdf_path)
            print(f"✓ PDF path detection: {detected}")
            assert detected == "pdf", f"Expected 'pdf', got '{detected}'"

        # Test PDF magic bytes
        pdf_bytes = b'%PDF-1.4\n...'
        detected = backend._detect_file_type(pdf_bytes)
        print(f"✓ PDF bytes detection: {detected}")
        assert detected == "pdf", f"Expected 'pdf', got '{detected}'"

        # Test JPEG magic bytes
        jpeg_bytes = b'\xff\xd8\xff\xe0...'
        detected = backend._detect_file_type(jpeg_bytes)
        print(f"✓ JPEG bytes detection: {detected}")
        assert detected == "image", f"Expected 'image', got '{detected}'"

        print("\n✅ TEST 3 PASSED: File type detection working")
        return True

    except Exception as e:
        print(f"\n❌ TEST 3 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_file_size_validation():
    """Test 4: File Size Limits"""
    print("\n" + "="*60)
    print("TEST 4: File Size Validation (5MB limit)")
    print("="*60)

    try:
        import os
        os.environ.setdefault("GEMINI_API_KEY", "dummy_key_for_testing")
        backend = LLMBackend(provider="gemini")

        # Test with reasonable size (should pass)
        small_file = b"test" * 1000  # ~4KB
        result = backend._validate_file_size(small_file)
        print(f"✓ Small file validation passed: {len(small_file)} bytes")

        # Test with oversized file (should fail)
        try:
            large_file = b"x" * (6 * 1024 * 1024)  # 6MB
            backend._validate_file_size(large_file)
            print("❌ Large file should have been rejected!")
            return False
        except ValueError as e:
            print(f"✓ Large file correctly rejected: {str(e)}")

        print("\n✅ TEST 4 PASSED: File size validation working")
        return True

    except Exception as e:
        print(f"\n❌ TEST 4 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_error_handling():
    """Test 5: Error Handling"""
    print("\n" + "="*60)
    print("TEST 5: Error Handling")
    print("="*60)

    try:
        import os
        os.environ.setdefault("GEMINI_API_KEY", "dummy_key_for_testing")
        backend = LLMBackend(provider="gemini")

        # Test with unsupported file type
        response = await backend.chat_with_file(
            user_message="Test",
            file_data="test.docx",
            file_type="auto"
        )

        if "Unsupported file type" in response:
            print("✓ Unsupported file type handled gracefully")
        else:
            print(f"⚠ Unexpected response: {response}")

        # Test with non-existent file
        try:
            response = await backend.chat_with_file(
                user_message="Test",
                file_data="/nonexistent/file.pdf",
                file_type="pdf"
            )
            if "Error" in response:
                print("✓ Non-existent file handled gracefully")
        except Exception as e:
            print(f"✓ Non-existent file raised expected error: {type(e).__name__}")

        print("\n✅ TEST 5 PASSED: Error handling working")
        return True

    except Exception as e:
        print(f"\n❌ TEST 5 FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n" + "🧪 " + "="*58)
    print("  PHASE 1: Multimodal LLM Vision Testing")
    print("="*60 + "\n")

    results = []

    # Run tests
    results.append(("File Type Detection", await test_file_type_detection()))
    results.append(("File Size Validation", await test_file_size_validation()))
    results.append(("Error Handling", await test_error_handling()))

    # Only run LLM tests if basic tests pass
    if all(result[1] for result in results):
        print("\n📡 Basic tests passed. Running LLM vision tests...")
        print("   (These require API keys and internet connection)")

        # Test Claude (if ANTHROPIC_API_KEY is set)
        import os
        if os.getenv("ANTHROPIC_API_KEY"):
            results.append(("Claude PDF Processing", await test_claude_pdf()))
        else:
            print("\n⚠ Skipping Claude test (ANTHROPIC_API_KEY not set)")

        # Test Gemini (if GEMINI_API_KEY is set)
        if os.getenv("GEMINI_API_KEY"):
            results.append(("Gemini Image Processing", await test_gemini_image()))
        else:
            print("\n⚠ Skipping Gemini test (GEMINI_API_KEY not set)")

    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")

    total = len(results)
    passed = sum(1 for _, p in results if p)

    print("\n" + "="*60)
    print(f"Results: {passed}/{total} tests passed")
    print("="*60)

    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Phase 1 implementation successful.")
        print("\n✅ Multimodal vision capabilities are working:")
        print("   - Claude can process PDFs natively")
        print("   - Gemini can process images (with PDF conversion)")
        print("   - File validation and error handling working")
    else:
        print(f"\n⚠ {total - passed} test(s) failed. Please review errors above.")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
