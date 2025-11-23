from typing import Dict, List, Optional
from google.cloud import documentai_v1 as documentai
import os
from dotenv import load_dotenv

class OCRProcessor:
    """OCR processor using Google Document AI for extracting text from photos."""
    
    def __init__(
        self, 
        project_id: Optional[str] = None,
        location: str = "us",
        processor_id: Optional[str] = None
    ):
        """Initialize the OCR processor.
        
        Args:
            project_id: Google Cloud project ID. If None, uses default from environment.
            location: Processor location (e.g., 'us', 'eu'). Defaults to 'us'.
            processor_id: Document AI processor ID. If None, uses default OCR processor.
        """
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT_ID")
        self.location = location
        self.processor_id = processor_id or os.getenv("DOCUMENTAI_PROCESSOR_ID")
        
        if not self.project_id:
            raise ValueError("project_id must be provided or GOOGLE_CLOUD_PROJECT_ID must be set")
        if not self.processor_id:
            raise ValueError("processor_id must be provided or DOCUMENTAI_PROCESSOR_ID must be set")
        
        self.client = documentai.DocumentProcessorServiceClient()
        self.processor_name = self.client.processor_path(
            self.project_id, self.location, self.processor_id
        )
        
        print(f"[DEBUG] Using processor: {self.processor_name}")
        print(f"[DEBUG] Project ID: {self.project_id}")
        print(f"[DEBUG] Location: {self.location}")
        print(f"[DEBUG] Processor ID: {self.processor_id}")
    
    def extract_text_from_photo(
        self, 
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> Dict[str, any]:
        """Extract text from a photo using Google Document AI.
        
        Args:
            image_bytes: Raw bytes of the image to process
            mime_type: MIME type of the image (e.g., 'image/jpeg', 'image/png')
            
        Returns:
            Dictionary containing:
                - text: Full extracted text
                - confidence: Overall confidence score (0-1)
                - pages: List of pages with detailed information
                - entities: Detected entities (if any)
                - blocks: Text blocks with bounding boxes
        """
        # Create the document
        raw_document = documentai.RawDocument(
            content=image_bytes,
            mime_type=mime_type
        )
        
        # Configure the process request
        request = documentai.ProcessRequest(
            name=self.processor_name,
            raw_document=raw_document
        )
        
        # Process the document
        result = self.client.process_document(request=request)
        document = result.document
        
        # Extract structured data
        return {
            "text": document.text,
            "confidence": self._calculate_confidence(document),
            "pages": self._extract_pages(document),
            "entities": self._extract_entities(document),
            "blocks": self._extract_blocks(document),
        }
    
    def _calculate_confidence(self, document: documentai.Document) -> float:
        """Calculate average confidence score from all pages.
        
        Args:
            document: Processed document from Document AI
            
        Returns:
            Average confidence score (0-1)
        """
        if not document.pages:
            return 0.0
        
        total_confidence = 0.0
        count = 0
        
        for page in document.pages:
            if page.tokens:
                for token in page.tokens:
                    if token.layout and token.layout.confidence:
                        total_confidence += token.layout.confidence
                        count += 1
        
        return total_confidence / count if count > 0 else 0.0
    
    def _extract_pages(self, document: documentai.Document) -> List[Dict]:
        """Extract page-level information.
        
        Args:
            document: Processed document from Document AI
            
        Returns:
            List of page dictionaries with dimensions and content
        """
        pages = []
        for page in document.pages:
            page_info = {
                "page_number": page.page_number,
                "width": page.dimension.width if page.dimension else None,
                "height": page.dimension.height if page.dimension else None,
                "lines": [],
                "paragraphs": [],
            }
            
            # Extract lines
            if page.lines:
                for line in page.lines:
                    page_info["lines"].append({
                        "text": self._get_text_from_layout(line.layout, document.text),
                        "confidence": line.layout.confidence if line.layout else None,
                        "bounding_box": self._get_bounding_box(line.layout),
                    })
            
            # Extract paragraphs
            if page.paragraphs:
                for paragraph in page.paragraphs:
                    page_info["paragraphs"].append({
                        "text": self._get_text_from_layout(paragraph.layout, document.text),
                        "confidence": paragraph.layout.confidence if paragraph.layout else None,
                        "bounding_box": self._get_bounding_box(paragraph.layout),
                    })
            
            pages.append(page_info)
        
        return pages
    
    def _extract_entities(self, document: documentai.Document) -> List[Dict]:
        """Extract detected entities from the document.
        
        Args:
            document: Processed document from Document AI
            
        Returns:
            List of entity dictionaries
        """
        entities = []
        for entity in document.entities:
            entity_info = {
                "type": entity.type_,
                "mention_text": entity.mention_text,
                "confidence": entity.confidence,
                "normalized_value": entity.normalized_value.text if entity.normalized_value else None,
            }
            entities.append(entity_info)
        
        return entities
    
    def _extract_blocks(self, document: documentai.Document) -> List[Dict]:
        """Extract text blocks with their positions.
        
        Args:
            document: Processed document from Document AI
            
        Returns:
            List of block dictionaries with text and bounding boxes
        """
        blocks = []
        for page in document.pages:
            if page.blocks:
                for block in page.blocks:
                    block_info = {
                        "text": self._get_text_from_layout(block.layout, document.text),
                        "confidence": block.layout.confidence if block.layout else None,
                        "bounding_box": self._get_bounding_box(block.layout),
                    }
                    blocks.append(block_info)
        
        return blocks
    
    def _get_text_from_layout(self, layout, full_text: str) -> str:
        """Extract text from a layout element.
        
        Args:
            layout: Layout element from Document AI
            full_text: Full document text
            
        Returns:
            Extracted text segment
        """
        if not layout or not layout.text_anchor or not layout.text_anchor.text_segments:
            return ""
        
        text = ""
        for segment in layout.text_anchor.text_segments:
            start_index = int(segment.start_index) if segment.start_index else 0
            end_index = int(segment.end_index) if segment.end_index else len(full_text)
            text += full_text[start_index:end_index]
        
        return text
    
    def _get_bounding_box(self, layout) -> Optional[Dict]:
        """Extract bounding box coordinates from layout.
        
        Args:
            layout: Layout element from Document AI
            
        Returns:
            Dictionary with bounding box coordinates or None
        """
        if not layout or not layout.bounding_poly:
            return None
        
        vertices = []
        for vertex in layout.bounding_poly.vertices:
            vertices.append({
                "x": vertex.x,
                "y": vertex.y,
            })
        
        return {"vertices": vertices}


# Utility functions
def list_processors(project_id: Optional[str] = None, location: str = "eu") -> List[Dict]:
    """List all available Document AI processors in a location.
    
    Args:
        project_id: Google Cloud project ID
        location: Processor location (e.g., 'us', 'eu')
        
    Returns:
        List of processor dictionaries with name, type, and ID
    """
    project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT_ID")
    if not project_id:
        raise ValueError("project_id must be provided or GOOGLE_CLOUD_PROJECT_ID must be set")
    
    client = documentai.DocumentProcessorServiceClient()
    parent = client.common_location_path(project_id, location)
    
    processors = []
    try:
        processor_list = client.list_processors(parent=parent)
        for processor in processor_list:
            processors.append({
                "name": processor.name,
                "display_name": processor.display_name,
                "type": processor.type_,
                "state": processor.state.name if processor.state else "UNKNOWN",
            })
    except Exception as e:
        print(f"Error listing processors: {e}")
    
    return processors


# Convenience function for simple OCR use cases
def extract_text_from_photo(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    project_id: Optional[str] = None,
    location: str = "us",
    processor_id: Optional[str] = None,
) -> str:
    """Simple function to extract text from a photo.
    
    Args:
        image_bytes: Raw bytes of the image to process
        mime_type: MIME type of the image
        project_id: Google Cloud project ID
        location: Processor location
        processor_id: Document AI processor ID
        
    Returns:
        Extracted text as a string
    """
    processor = OCRProcessor(
        project_id=project_id,
        location=location,
        processor_id=processor_id,
    )
    result = processor.extract_text_from_photo(image_bytes, mime_type)
    return result["text"]


if __name__ == "__main__":
    # Example usage
    load_dotenv()
    
    
    with open("./im.png", "rb") as f:
        image_bytes = f.read()
    
    try:
        processor = OCRProcessor()
        result = processor.extract_text_from_photo(image_bytes, mime_type="image/png")
        print(f"\n✓ OCR Successful!")
        print(f"Text: {result['text'][:200]}...")  # First 200 chars
        print(f"Confidence: {result['confidence']:.2%}")
        print(f"Number of pages: {len(result['pages'])}")
        print(f"Number of entities: {len(result['entities'])}")
    except Exception as e:
        print(f"\n✗ OCR Failed: {e}")

