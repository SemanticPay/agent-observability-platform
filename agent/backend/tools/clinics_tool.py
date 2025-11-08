"""Clinic availability MCP tool for finding and booking exam slots."""
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

# Mock database of clinics
MOCK_CLINICS = [
    {
        "id": 1,
        "name": "Clínica Médica Vila Mariana",
        "address": "Rua Domingos de Morais, 2000, Vila Mariana, São Paulo",
        "latitude": -23.5925,
        "longitude": -46.6336,
        "verified": True,
        "available_slots": []
    },
    {
        "id": 2,
        "name": "Centro de Exames Pinheiros",
        "address": "Rua dos Pinheiros, 500, Pinheiros, São Paulo",
        "latitude": -23.5679,
        "longitude": -46.6922,
        "verified": True,
        "available_slots": []
    },
    {
        "id": 3,
        "name": "Clínica Moema Saúde",
        "address": "Av. Ibirapuera, 3000, Moema, São Paulo",
        "latitude": -23.6025,
        "longitude": -46.6678,
        "verified": True,
        "available_slots": []
    },
    {
        "id": 4,
        "name": "Exames Centro",
        "address": "Av. Paulista, 1000, Centro, São Paulo",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "verified": True,
        "available_slots": []
    },
    {
        "id": 5,
        "name": "Clínica Não Verificada",
        "address": "Rua Teste, 123, São Paulo",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "verified": False,
        "available_slots": []
    }
]


def generate_available_slots(date_str: str, clinic_id: int) -> List[Dict]:
    """
    Generate mock available slots for a clinic on a given date.
    
    Args:
        date_str: Date string in format YYYY-MM-DD
        clinic_id: Clinic ID
        
    Returns:
        List of available time slots
    """
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        # Try other formats
        try:
            date_obj = datetime.strptime(date_str, "%d/%m/%Y")
        except ValueError:
            logger.error(f"Invalid date format: {date_str}")
            return []
    
    # Generate slots from 8:00 to 18:00 every hour
    slots = []
    for hour in range(8, 18):
        slot_time = date_obj.replace(hour=hour, minute=0, second=0, microsecond=0)
        slots.append({
            "slot_id": f"{clinic_id}_{slot_time.isoformat()}",
            "datetime": slot_time.isoformat(),
            "time": slot_time.strftime("%H:%M"),
            "available": True
        })
    
    return slots


def find_nearby_clinics(latitude: float, longitude: float, radius_km: float = 10.0, verified_only: bool = True) -> List[Dict]:
    """
    Find clinics near given coordinates.
    
    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate
        radius_km: Search radius in kilometers
        verified_only: Only return verified clinics
        
    Returns:
        List of nearby clinics with distance
    """
    import math
    
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates in kilometers."""
        R = 6371  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return R * c
    
    nearby_clinics = []
    
    for clinic in MOCK_CLINICS:
        if verified_only and not clinic["verified"]:
            continue
        
        distance = calculate_distance(latitude, longitude, clinic["latitude"], clinic["longitude"])
        
        if distance <= radius_km:
            clinic_copy = clinic.copy()
            clinic_copy["distance_km"] = round(distance, 2)
            nearby_clinics.append(clinic_copy)
    
    # Sort by distance
    nearby_clinics.sort(key=lambda x: x["distance_km"])
    
    return nearby_clinics


def check_clinic_availability(clinic_id: int, date_str: str, time_preference: Optional[str] = None) -> Dict:
    """
    Check availability for a clinic on a specific date.
    
    Args:
        clinic_id: Clinic ID
        date_str: Date string
        time_preference: Preferred time (e.g., "morning", "afternoon", "08:00")
        
    Returns:
        Dictionary with clinic info and available slots
    """
    # Find clinic
    clinic = next((c for c in MOCK_CLINICS if c["id"] == clinic_id), None)
    
    if not clinic:
        return {"error": f"Clinic with ID {clinic_id} not found"}
    
    if not clinic["verified"]:
        return {"error": "Clinic is not verified"}
    
    # Generate available slots
    slots = generate_available_slots(date_str, clinic_id)
    
    # Filter by time preference if provided
    if time_preference:
        time_lower = time_preference.lower()
        if "morning" in time_lower:
            slots = [s for s in slots if int(s["time"].split(":")[0]) < 12]
        elif "afternoon" in time_lower:
            slots = [s for s in slots if int(s["time"].split(":")[0]) >= 12]
        elif ":" in time_preference:
            # Specific time
            preferred_hour = int(time_preference.split(":")[0])
            slots = [s for s in slots if abs(int(s["time"].split(":")[0]) - preferred_hour) <= 2]
    
    return {
        "clinic_id": clinic_id,
        "clinic_name": clinic["name"],
        "clinic_address": clinic["address"],
        "date": date_str,
        "available_slots": slots,
        "total_slots": len(slots)
    }


def book_slot(clinic_id: int, slot_id: str, patient_name: Optional[str] = None) -> Dict:
    """
    Book an exam slot (mock implementation).
    
    Args:
        clinic_id: Clinic ID
        slot_id: Slot ID to book
        patient_name: Patient name (optional)
        
    Returns:
        Booking confirmation
    """
    logger.info(f"Booking slot {slot_id} at clinic {clinic_id}")
    
    # Find clinic
    clinic = next((c for c in MOCK_CLINICS if c["id"] == clinic_id), None)
    
    if not clinic:
        return {"success": False, "error": "Clinic not found"}
    
    if not clinic["verified"]:
        return {"success": False, "error": "Clinic is not verified"}
    
    # Mock booking - in production, this would update the database
    booking_id = f"BOOK_{clinic_id}_{slot_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    return {
        "success": True,
        "booking_id": booking_id,
        "clinic_name": clinic["name"],
        "clinic_address": clinic["address"],
        "slot_id": slot_id,
        "patient_name": patient_name or "Not provided",
        "message": "Slot booked successfully"
    }


# MCP tool functions for the agent
def search_nearby_clinics(location: str, date: str, time_preference: str = None) -> str:
    """
    MCP tool to search for nearby clinics with availability.
    
    Args:
        location: Location name or address
        date: Date string (YYYY-MM-DD or DD/MM/YYYY)
        time_preference: Time preference (morning, afternoon, or specific time)
        
    Returns:
        JSON string with nearby clinics and availability
    """
    import sys
    import os
    # Add root directory to path
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
    if root_dir not in sys.path:
        sys.path.insert(0, root_dir)
    
    from agent.backend.tools.maps_tool import geocode_address
    
    # Get coordinates
    geocode_result = geocode_address(location)
    latitude = geocode_result["latitude"]
    longitude = geocode_result["longitude"]
    
    # Find nearby clinics
    clinics = find_nearby_clinics(latitude, longitude, verified_only=True)
    
    # Check availability for each clinic
    results = []
    for clinic in clinics[:5]:  # Limit to 5 closest
        availability = check_clinic_availability(clinic["id"], date, time_preference)
        if availability.get("available_slots"):
            results.append({
                "clinic_id": clinic["id"],
                "clinic_name": clinic["name"],
                "clinic_address": clinic["address"],
                "distance_km": clinic["distance_km"],
                "available_slots": availability["available_slots"],
                "total_slots": availability["total_slots"]
            })
    
    return json.dumps({
        "location": geocode_result["formatted_address"],
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "date": date,
        "time_preference": time_preference,
        "clinics": results,
        "total_found": len(results)
    })


def book_exam_slot(clinic_id: int, slot_id: str, patient_name: str = None) -> str:
    """
    MCP tool to book an exam slot.
    
    Args:
        clinic_id: Clinic ID
        slot_id: Slot ID to book
        patient_name: Patient name (optional)
        
    Returns:
        JSON string with booking confirmation
    """
    result = book_slot(clinic_id, slot_id, patient_name)
    return json.dumps(result)

