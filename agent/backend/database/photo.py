from typing import Optional
from agent.backend.database.base import BaseDatabase
from agent.backend.types.types import Photo


class MockPhotoDatabase(BaseDatabase): 
    def __init__(self):
        self.photos: list[Photo] = []
        self.next_id = 1

    def connect(self):
        """Connect to the mock database (no-op for mock)."""
        print("Connected to MockPhotoDatabase")

    def disconnect(self):
        """Disconnect from the mock database (no-op for mock)."""
        print("Disconnected from MockPhotoDatabase")

    def save_photo(self, photo: Photo) -> Photo:
        """Save a photo and return it with its assigned ID."""
        photo_id = str(self.next_id)
        self.next_id += 1
        photo.id = photo_id
        
        self.photos.append(photo)
        return photo

    def get_photo(self, photo_id: str) -> Optional[Photo]:
        """Retrieve a photo by its ID."""
        for photo in self.photos:
            if photo.id == photo_id:
                return photo
        return None

    def get_all_photos(self) -> list[Photo]:
        """Retrieve all photos."""
        return self.photos
