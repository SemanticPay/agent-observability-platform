"""
Key definitions for storing state related to driver's license agent.

@type: list[str]
@example:
```
[
    "[Source: Document Title 1]
    Content of the first document chunk.",
    "[Source: Document Title 2]
    Content of the second document chunk.",
    ...
]
```
"""
DRIVERS_LICENSE_CONTEXT = "X-drivers-license-context"

"""
@type: Location
Key for storing location information described in the query.
"""
QUERY_LOCATION = "X-clinic-location"

"""
@type: list[Clinic]
Key for storing nearby clinics information.
"""
NEARBY_CLINICS = "X-nearby-clinics"

"""
@type: Booking
Key for storing exam booking information.
"""
EXAM_BOOKING = "X-exam-booking"

"""
@type: bool
Key to indicate the UI should show the location picker.
"""
SHOW_LOCATION_PICKER = "X-show-location-picker"

"""
@type: Location
Key for storing user-selected location from the UI picker.
"""
USER_SELECTED_LOCATION = "X-user-selected-location"

# --- DETRAN v2 State Keys ---

"""
@type: str (UUID)
Key for storing the current authenticated user's ID.
"""
CURRENT_USER_ID = "X-current-user-id"

"""
@type: str (UUID)
Key for storing the current ticket ID being processed.
"""
CURRENT_TICKET_ID = "X-current-ticket-id"

"""
@type: bool
Key to indicate a payment is pending for the current ticket.
"""
PAYMENT_PENDING = "X-payment-pending"
