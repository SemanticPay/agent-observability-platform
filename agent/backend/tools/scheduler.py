"""Tools for the Scheduler Agent."""
import logging
from datetime import datetime, timedelta
from typing import Optional
from math import radians, sin, cos, sqrt, atan2
from agent.backend.database.booking import MockBookingDatabase
from agent.backend.database.clinic import MockClinicDatabase
from agent.backend.state import keys
from agent.backend.types.types import Booking, Clinic, ExamType, Location
from google.adk.tools import ToolContext
import googlemaps
from config import GOOGLE_API_KEY

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


gmaps = googlemaps.Client(key=GOOGLE_API_KEY)

BOOKING_DB = MockBookingDatabase()
BOOKING_DB.connect()
# TODO: db connection and disconnection handling

CLINIC_DB = MockClinicDatabase()
CLINIC_DB.connect()
# TODO: db connection and disconnection handling


def geocode_location(location_query: str, tool_context: Optional[ToolContext] = None) -> Location:
    """
    Geocode a location query using Google Maps API.
    
    Args:
        location_query: Natural language location query (e.g., "Vila Mariana, São Paulo")
        
    Returns:
        List of possible locations with coordinates
    """
    try:
        results = gmaps.geocode(location_query)  # type: ignore
        logger.info(f"Geocoded {location_query}: found {len(results)} results")
        result = results[0]
        logger.info(f"First Result: {result}")
        
        geometry = result['geometry']['location']
        address_components = result.get('address_components', [])
        
        city = ""
        state = ""
        for component in address_components:
            if 'locality' in component['types']:
                city = component['long_name']
            if 'administrative_area_level_1' in component['types']:
                state = component['short_name']
        
        location = Location(
            address=result['formatted_address'],
            latitude=geometry['lat'],
            longitude=geometry['lng'],
            city=city,
            state=state
        )

        if tool_context:
            tool_context.state[keys.QUERY_LOCATION] = location.model_dump()
            logger.info(f"Location stored in state: {location}")
        
        return location
        
    except Exception as e:
        logger.error(f"Error geocoding location: {e}")
        raise


def _calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points using Haversine formula (in km)."""
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def search_nearby_clinics(
    exam_type: str,
    tool_context: Optional[ToolContext] = None,
) -> list[Clinic]:
    """
    Search for verified clinics near a location.
    
    Args:
        exam_type: Type of exam ("medical" or "driving")
        
    Returns:
        List of clinics with distance information
    """
    try:
        exam_type_enum = ExamType(exam_type)
    except ValueError:
        logger.error(f"Invalid exam type: {exam_type}")
        return []

    if tool_context:
        location_raw = tool_context.state.get(keys.QUERY_LOCATION)
        if not location_raw:
            logger.error("No location found in tool context state")
            return []
        location = Location(**location_raw)
        logger.info(f"Using location from state: {location}")
    else:
        # testing fallback
        location = Location(
            address='Dhafeer St - Al Sa`Adah - E40 - Abu Dhabi - United Arab Emirates',
            latitude=24.43011,
            longitude=54.43676800000001,
            city='Abu Dhabi',
            state='Abu Dhabi'
        )
        logger.info(f"Using fallback location: {location}")
    

    max_distance_km = 10000000.0 # TODO: make configurable
    max_results = 5
    
    nearby_clinics = []
    # TODO: replace with real DB query with geospatial indexing
    for clinic in CLINIC_DB.get_all_clinics():
        if len(nearby_clinics) >= max_results:
            break
        if exam_type_enum not in clinic.exam_types:
            logger.info(f"Skipping clinic {clinic.name} as it does not offer exam type '{exam_type_enum}', but offers {clinic.exam_types}")
            continue
            
        distance = _calculate_distance(location.latitude, location.longitude, clinic.latitude, clinic.longitude)
        if distance <= max_distance_km:
            nearby_clinics.append(clinic.deepcopy())
    
    nearby_clinics.sort(key=lambda c: c.distance_km)

    if tool_context:
        tool_context.state[keys.NEARBY_CLINICS] = [c.model_dump() for c in nearby_clinics]
    logger.info(f"Found {len(nearby_clinics)} nearby clinics for exam type '{exam_type_enum}'") 
    return nearby_clinics
   

def book_exam(
    clinic_id: str,
    exam_type: str,
    datetime_str: str,
    citizen_name: str,
    tool_context: Optional[ToolContext] = None,
) -> Optional[Booking]:
    """
    Book an exam slot at a clinic.
    
    Args:
        clinic_id: ID of the clinic
        exam_type: Type of exam ("medical" or "driving")
        datetime_str: Date and time in ISO format
        citizen_name: Name of the citizen
        
    Returns:
        Booking confirmation details
    """
    try:
        exam_type_enum = ExamType(exam_type)
    except ValueError:
        logger.error(f"Invalid exam type: {exam_type}")
        return None

    logger.info(f"Booking slot at clinic {clinic_id} for {exam_type_enum} on {datetime_str} for {citizen_name}")

    nearby_clinics = []
    if tool_context:
        nearby_clinics_raw = tool_context.state.get(keys.NEARBY_CLINICS, [])
        nearby_clinics = [Clinic(**c) for c in nearby_clinics_raw]
        logger.info(f"Retrieved {len(nearby_clinics)} nearby clinics from state")
    else:
        # testing fallback
        nearby_clinics = [CLINIC_DB.get_clinic(clinic_id)]
        logger.info(f"Using fallback clinic data for clinic ID {clinic_id}")
    
    clinic = next((c for c in nearby_clinics if c.id == clinic_id), None)  # type: ignore
    if not clinic:
        logger.error(f"Clinic ID {clinic_id} not found in nearby clinics")
        return None

    logger.info(f"Clinic found: {clinic.name} at {clinic.address}")
    
    booking = Booking(
        clinic_id=clinic_id,
        exam_type=exam_type_enum,
        datetime=datetime.fromisoformat(datetime_str),
        citizen_name=citizen_name
    )

    booking = BOOKING_DB.create_booking(booking)
    logger.info(f"Booking created with ID: {booking.id}")

    if tool_context:
        tool_context.state[keys.EXAM_BOOKING] = booking.model_dump()
        logger.info(f"Booking with id {booking.id} stored in state")

    return booking


if __name__ == "__main__":
    location = geocode_location("Rabdan Academy, Dhafeer St, Abu Dhabi")
    print("Geocoded Location:", location)
    clinics = search_nearby_clinics("medical")
    print("Nearby Clinics:", clinics)
    if clinics:
        booking = book_exam(
            clinic_id=clinics[0].id,  # type: ignore
            exam_type="medical",
            datetime_str=(datetime.now() + timedelta(days=3)).isoformat(),
            citizen_name="John Doe",
        )
        logger.info(f"Booking confirmed: {booking}")
        print("BOOKING:", BOOKING_DB.get_booking(booking.id))  # type: ignore
