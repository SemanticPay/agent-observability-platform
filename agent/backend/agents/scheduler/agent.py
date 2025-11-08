"""Scheduler Agent - Sub-agent for booking exam slots at verified clinics."""
import logging
import sys
import os
import json

# Add root directory to path for config import
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from google.adk.agents import Agent
from agent.backend.agents.scheduler.prompt import PROMPT
from agent.backend.tools.maps_tool import get_location_coordinates as maps_get_coordinates
from agent.backend.tools.clinics_tool import search_nearby_clinics, book_exam_slot

logger = logging.getLogger(__name__)


def get_location_coords(location: str) -> str:
    """
    Get coordinates for a location using Google Maps.
    
    Args:
        location: Location name or address
        
    Returns:
        JSON string with coordinates
    """
    try:
        return maps_get_coordinates(location)
    except Exception as e:
        logger.error(f"Error getting location coordinates: {e}")
        return json.dumps({"error": str(e), "status": "ERROR"})


def search_clinics(location: str, date: str, time_preference: str = None) -> str:
    """
    Search for nearby verified clinics with available slots.
    
    Args:
        location: Location name or address
        date: Date string (YYYY-MM-DD or DD/MM/YYYY)
        time_preference: Time preference (morning, afternoon, or specific time like "08:00")
        
    Returns:
        JSON string with clinic search results
    """
    try:
        return search_nearby_clinics(location, date, time_preference)
    except Exception as e:
        logger.error(f"Error searching clinics: {e}")
        return json.dumps({"error": str(e), "status": "ERROR"})


def confirm_and_book(clinic_id: int, slot_id: str, patient_name: str = None) -> str:
    """
    Book an exam slot after confirmation.
    
    Args:
        clinic_id: Clinic ID
        slot_id: Slot ID to book
        patient_name: Patient name (optional)
        
    Returns:
        JSON string with booking confirmation
    """
    try:
        return book_exam_slot(clinic_id, slot_id, patient_name)
    except Exception as e:
        logger.error(f"Error booking slot: {e}")
        return json.dumps({"error": str(e), "status": "ERROR"})


# Create the Scheduler Agent
scheduler_agent = Agent(
    model="gemini-2.0-flash-exp",
    name="scheduler_agent",
    description="Specialized agent for finding and booking exam slots (medical or driving) at verified clinics",
    instruction=PROMPT,
    tools=[
        {
            "name": "get_location_coordinates",
            "description": "Get latitude and longitude coordinates for a location or address using Google Maps. Use this when the user provides a location name or address and you need to find nearby clinics.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Location name or address (e.g., 'Vila Mariana', 'Rua Domingos de Morais, 2000, São Paulo')"
                    }
                },
                "required": ["location"]
            },
            "function": get_location_coords
        },
        {
            "name": "search_nearby_clinics",
            "description": "Search for verified clinics near a location with available exam slots for a specific date and time preference. Returns clinics with their available time slots.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Location name or address"
                    },
                    "date": {
                        "type": "string",
                        "description": "Date in format YYYY-MM-DD or DD/MM/YYYY (e.g., '2024-12-10' or '10/12/2024')"
                    },
                    "time_preference": {
                        "type": "string",
                        "description": "Time preference: 'morning', 'afternoon', or specific time like '08:00' or '14:30'. Optional."
                    }
                },
                "required": ["location", "date"]
            },
            "function": search_clinics
        },
        {
            "name": "book_exam_slot",
            "description": "Book an exam slot at a clinic. Use this ONLY after the user has confirmed they want to book a specific slot. Always confirm with the user before calling this function.",
            "parameters": {
                "type": "object",
                "properties": {
                    "clinic_id": {
                        "type": "integer",
                        "description": "The ID of the clinic"
                    },
                    "slot_id": {
                        "type": "string",
                        "description": "The ID of the time slot to book"
                    },
                    "patient_name": {
                        "type": "string",
                        "description": "Patient name (optional)"
                    }
                },
                "required": ["clinic_id", "slot_id"]
            },
            "function": confirm_and_book
        }
    ]
)

