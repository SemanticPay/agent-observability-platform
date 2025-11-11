from typing import Optional
from agent.backend.database.base import BaseDatabase
from agent.backend.types.types import Booking


class MockBookingDatabase(BaseDatabase): 
    def __init__(self):
        self.bookings: list[Booking] = []
        self.next_id = 1

    def connect(self):
        """Connect to the mock database (no-op for mock)."""
        print("Connected to MockBookingDatabase")

    def disconnect(self):
        """Disconnect from the mock database (no-op for mock)."""
        print("Disconnected from MockBookingDatabase")

    def create_booking(self, booking: Booking) -> Booking:
        """Create a new booking and return the booking with its assigned ID."""
        booking_id = str(self.next_id)
        self.next_id += 1
        booking.id = booking_id
        
        self.bookings.append(booking)
        return booking

    def get_booking(self, booking_id) -> Optional[Booking]:
        """Retrieve a booking by its ID. Returns None if not found."""
        for booking in self.bookings:
            if booking.id == booking_id:
                return booking
        return None
