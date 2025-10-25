import re
import logging
from typing import List
import PyPDF2

logger = logging.getLogger(__name__)

class PDFProcessor:
    def __init__(self):
        pass

    async def process_pdf(self, file_path: str) -> List[str]:
        """Extract node IDs from PDF - returns simple list of node IDs found"""
        try:
            node_ids = self._find_node_ids(file_path)
            logger.info(f"Found {len(node_ids)} nodes: {node_ids}")
            return node_ids
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise

    def _find_node_ids(self, file_path: str) -> List[str]:
        """Simple node ID scanner - finds N001, N002, etc. patterns in PDF"""
        node_ids = set()

        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)

                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        # Find all node ID patterns
                        matches = re.findall(r'N\d{3}[a-zA-Z]?', text, re.IGNORECASE)
                        for match in matches:
                            node_ids.add(match.upper())

        except Exception as e:
            logger.error(f"Error reading PDF: {str(e)}")
            raise

        # Return sorted list
        return sorted(list(node_ids))