from google.cloud import vision

from agent.backend.types.types import PhotoClassificationEnum


CLASSIFICATION_CLIENT = vision.ImageAnnotatorClient()


def classify_photo(image_bytes: bytes) -> PhotoClassificationEnum:
    """Classify a photo as passport, driving license, or unknown using OCR.
    
    Args:
        image_bytes: Raw bytes of the image to classify
        
    Returns:
        PhotoClassificationEnum indicating the document type
    """
    image = vision.Image(content=image_bytes)
    response = CLASSIFICATION_CLIENT.text_detection(image=image)  # type: ignore
    text = response.text_annotations[0].description.lower() if response.text_annotations else ""

    if has_passport_keywords(text):
        return PhotoClassificationEnum.PASSPORT
    elif has_driver_license_keywords(text):
        return PhotoClassificationEnum.DRIVING_LICENSE
    else:
        return PhotoClassificationEnum.UNKNOWN


def has_driver_license_keywords(text: str) -> bool:
    """Check if text contains driver's license keywords.
    
    Args:
        text: Text to search for keywords
        
    Returns:
        True if driver's license keywords are found
    """
    keywords = ["driver", "licence", "license"]
    return any(keyword in text.lower() for keyword in keywords)


def has_passport_keywords(text: str) -> bool:
    """Check if text contains passport keywords.
    
    Args:
        text: Text to search for keywords
        
    Returns:
        True if passport keyword is found
    """
    return "passport" in text.lower()


if __name__ == "__main__":
    with open("/home/homayoon/Downloads/test-driver-license.jpeg", "rb") as f:
        image_bytes = f.read()
    id_type = classify_photo(image_bytes)
    print("TYPE:", id_type)
