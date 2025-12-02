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
