import { useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { useState, useCallback } from "react";

export interface Clinic {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  exam_types: string[];
  distance_km: number;
}

interface ClinicsMapProps {
  clinics: Clinic[];
  userLocation?: { lat: number; lng: number };
  onClinicSelect?: (clinic: Clinic) => void;
}

const mapContainerStyle = {
  width: "70%",
  aspectRatio: "6 / 2",
  borderRadius: "12px",
};

const libraries: ("places")[] = ["places"];

export default function ClinicsMap({
  clinics,
  userLocation,
  onClinicSelect,
}: ClinicsMapProps) {
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Calculate center based on clinics or user location
  const mapCenter = useMemo(() => {
    if (userLocation) {
      return userLocation;
    }
    if (clinics.length > 0) {
      const avgLat = clinics.reduce((sum, c) => sum + c.latitude, 0) / clinics.length;
      const avgLng = clinics.reduce((sum, c) => sum + c.longitude, 0) / clinics.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: -23.5505, lng: -46.6333 }; // Default São Paulo
  }, [clinics, userLocation]);

  // Calculate bounds to fit all markers
  const mapBounds = useMemo(() => {
    if (!isLoaded || clinics.length === 0) return null;
    
    const bounds = new google.maps.LatLngBounds();
    clinics.forEach(clinic => {
      bounds.extend({ lat: clinic.latitude, lng: clinic.longitude });
    });
    if (userLocation) {
      bounds.extend(userLocation);
    }
    return bounds;
  }, [clinics, userLocation, isLoaded]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (mapBounds) {
      map.fitBounds(mapBounds, { padding: 50 });
    }
  }, [mapBounds]);

  const handleMarkerClick = useCallback((clinic: Clinic) => {
    setSelectedClinic(clinic);
  }, []);

  const handleSelectClinic = useCallback((clinic: Clinic) => {
    if (onClinicSelect) {
      onClinicSelect(clinic);
    }
  }, [onClinicSelect]);

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <p className="font-medium">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2">
        <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {clinics.length} Clinic{clinics.length !== 1 ? 's' : ''} Found Nearby
        </h3>
      </div>

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={13}
        onLoad={onMapLoad}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#3b82f6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            }}
            title="Your location"
          />
        )}

        {/* Clinic markers */}
        {clinics.map((clinic, index) => (
          <Marker
            key={clinic.id}
            position={{ lat: clinic.latitude, lng: clinic.longitude }}
            onClick={() => handleMarkerClick(clinic)}
            label={{
              text: String(index + 1),
              color: "white",
              fontWeight: "bold",
              fontSize: "12px",
            }}
            icon={{
              url: `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                  <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#dc2626"/>
                  <circle cx="16" cy="14" r="8" fill="white"/>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(32, 40),
              anchor: new google.maps.Point(16, 40),
              labelOrigin: new google.maps.Point(16, 14),
            }}
          />
        ))}

        {/* Info Window for selected clinic */}
        {selectedClinic && (
          <InfoWindow
            position={{ lat: selectedClinic.latitude, lng: selectedClinic.longitude }}
            onCloseClick={() => setSelectedClinic(null)}
          >
            <div className="p-2 max-w-[200px]">
              <h4 className="font-bold text-gray-900 text-sm">{selectedClinic.name}</h4>
              <p className="text-gray-600 text-xs mt-1">{selectedClinic.address}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {selectedClinic.distance_km.toFixed(1)} km
                </span>
              </div>
              {onClinicSelect && (
                <button
                  onClick={() => handleSelectClinic(selectedClinic)}
                  className="mt-2 w-full bg-green-600 text-white text-xs py-1.5 px-3 rounded hover:bg-green-700 transition-colors font-medium"
                >
                  Select This Clinic
                </button>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Clinic List */}
      <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
        {clinics.map((clinic, index) => (
          <div
            key={clinic.id}
            onClick={() => setSelectedClinic(clinic)}
            className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              selectedClinic?.id === clinic.id
                ? "bg-green-50 border border-green-200"
                : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            <div className="flex-shrink-0 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm truncate">{clinic.name}</h4>
              <p className="text-gray-500 text-xs truncate">{clinic.address}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-blue-600 font-medium">
                  {clinic.distance_km.toFixed(1)} km away
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {clinic.exam_types.join(", ")}
                </span>
              </div>
            </div>
            {onClinicSelect && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectClinic(clinic);
                }}
                className="flex-shrink-0 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
              >
                Select
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

