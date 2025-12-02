import { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";

export interface SelectedLocation {
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
}

interface LocationPickerProps {
  onLocationSelect: (location: SelectedLocation) => void;
  onCancel: () => void;
  initialCenter?: { lat: number; lng: number };
}

const mapContainerStyle = {
  width: "100%",
  height: "350px",
  borderRadius: "12px",
};

// Default to São Paulo, Brazil
const defaultCenter = {
  lat: -23.5505,
  lng: -46.6333,
};

const libraries: ("places")[] = ["places"];

export default function LocationPicker({
  onLocationSelect,
  onCancel,
  initialCenter = defaultCenter,
}: LocationPickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");
  const [mapCenter, setMapCenter] = useState(initialCenter);
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const extractAddressComponents = (place: google.maps.places.PlaceResult) => {
    let city = "";
    let state = "";
    
    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes("locality")) {
          city = component.long_name;
        }
        if (component.types.includes("administrative_area_level_1")) {
          state = component.short_name;
        }
      }
    }
    
    return { city, state };
  };

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || "";
        const { city, state } = extractAddressComponents(place);
        
        setSelectedPosition({ lat, lng });
        setSelectedAddress(address);
        setSelectedCity(city);
        setSelectedState(state);
        setMapCenter({ lat, lng });
        setSearchValue(address);
        
        // Zoom to the selected location
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
      }
    }
  }, []);

  const onMapClick = useCallback(async (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      setSelectedPosition({ lat, lng });
      
      // Set a default address immediately so the button enables
      const fallbackAddress = `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedAddress(fallbackAddress);
      setSearchValue(fallbackAddress);
      
      // Try to reverse geocode to get a better address
      try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results[0]) {
          const place = response.results[0];
          const address = place.formatted_address;
          const { city, state } = extractAddressComponents(place);
          
          setSelectedAddress(address);
          setSelectedCity(city);
          setSelectedState(state);
          setSearchValue(address);
        }
      } catch (error) {
        console.error("Geocoding error (using coordinates instead):", error);
        // Keep the fallback address - button will still work
      }
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedPosition && selectedAddress) {
      onLocationSelect({
        address: selectedAddress,
        latitude: selectedPosition.lat,
        longitude: selectedPosition.lng,
        city: selectedCity,
        state: selectedState,
      });
    }
  }, [selectedPosition, selectedAddress, selectedCity, selectedState, onLocationSelect]);

  // Try to get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(newCenter);
          if (mapRef.current) {
            mapRef.current.panTo(newCenter);
          }
        },
        () => {
          // Geolocation denied or error - use default
          console.log("Geolocation not available, using default center");
        }
      );
    }
  }, []);

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <p className="font-medium">Error loading Google Maps</p>
        <p className="text-sm mt-1">Please check your API key configuration.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Select Location
        </h3>
        <p className="text-blue-100 text-sm mt-1">
          Search or click on the map to select your location
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Input */}
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            types: ["geocode", "establishment"],
            componentRestrictions: { country: "br" }, // Restrict to Brazil
          }}
        >
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search for an address or place..."
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </Autocomplete>

        {/* Map */}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={12}
          onLoad={onMapLoad}
          onClick={onMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false, // Disable POI clicks so our onClick works
          }}
        >
          {selectedPosition && (
            <Marker
              position={selectedPosition}
              animation={google.maps.Animation.DROP}
            />
          )}
        </GoogleMap>

        {/* Selected Address Display */}
        {selectedAddress && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-sm text-blue-700 font-medium">Selected Location:</p>
            <p className="text-gray-800 mt-1">{selectedAddress}</p>
            {(selectedCity || selectedState) && (
              <p className="text-gray-500 text-sm mt-1">
                {[selectedCity, selectedState].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons - Stacked vertically for visibility */}
        <div className="space-y-3 pt-3">
          {/* Confirm Button - Primary action, shown first */}
          <button
            onClick={handleConfirm}
            type="button"
            disabled={!selectedPosition || !selectedAddress}
            style={{ 
              backgroundColor: selectedPosition && selectedAddress ? '#16a34a' : '#d1d5db',
              color: 'white',
              padding: '14px 20px',
              borderRadius: '10px',
              fontWeight: 'bold',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: selectedPosition && selectedAddress ? 'pointer' : 'not-allowed',
              border: 'none',
              fontSize: '16px',
            }}
          >
            ✓ SELECT THIS LOCATION
          </button>
          
          {/* Cancel Button - Secondary action */}
          <button
            onClick={onCancel}
            type="button"
            style={{
              backgroundColor: 'white',
              color: '#374151',
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: '600',
              width: '100%',
              border: '2px solid #d1d5db',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

