"""Document ingestion system for fetching and processing legal documents."""
import requests
from bs4 import BeautifulSoup
import html2text
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DocumentIngester:
    """Handles fetching and processing documents from URLs."""
    
    def __init__(self):
        self.html_converter = html2text.HTML2Text()
        self.html_converter.ignore_links = False
        self.html_converter.ignore_images = True
        self.html_converter.body_width = 0  # Don't wrap lines
        
    def fetch_document(self, url: str) -> Dict[str, str]:
        """
        Fetch a document from a URL and extract its content.
        
        Args:
            url: The URL to fetch
            
        Returns:
            Dictionary with 'url', 'title', and 'content' keys
        """
        try:
            logger.info(f"Fetching document from: {url}")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Extract title
            title = soup.find('title')
            title_text = title.get_text().strip() if title else url
            
            # Convert HTML to clean text
            text_content = self.html_converter.handle(str(soup))
            
            # Clean up the text
            text_content = self._clean_text(text_content)
            
            return {
                'url': url,
                'title': title_text,
                'content': text_content
            }
            
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error processing {url}: {e}")
            raise
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content."""
        # Remove excessive whitespace
        lines = [line.strip() for line in text.split('\n')]
        lines = [line for line in lines if line]  # Remove empty lines
        
        # Join with single newlines, but preserve paragraph breaks
        cleaned = '\n'.join(lines)
        
        # Remove excessive newlines (more than 2 consecutive)
        while '\n\n\n' in cleaned:
            cleaned = cleaned.replace('\n\n\n', '\n\n')
            
        return cleaned
    
    def fetch_all_documents(self, urls: List[str]) -> List[Dict[str, str]]:
        """
        Fetch all documents from a list of URLs.
        
        Args:
            urls: List of URLs to fetch
            
        Returns:
            List of document dictionaries
        """
        documents = []
        for url in urls:
            try:
                doc = self.fetch_document(url)
                documents.append(doc)
                logger.info(f"Successfully fetched: {doc['title']}")
            except Exception as e:
                logger.error(f"Failed to fetch {url}: {e}")
                # Continue with other documents even if one fails
                continue
                
        return documents

