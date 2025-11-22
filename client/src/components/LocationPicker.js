import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

const LocationPicker = ({ location, coordinates, onLocationChange, onCoordinatesChange }) => {
  const [searchQuery, setSearchQuery] = useState(location || '');
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (location) {
      setSearchQuery(location);
    }
  }, [location]);

  const handleMapClick = async (latlng) => {
    const lat = latlng.lat;
    const lng = latlng.lng;
    
    onCoordinatesChange({ lat, lng });
    
    // Reverse geocode using Nominatim (free OpenStreetMap geocoding service)
    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        onLocationChange(data.display_name);
        setSearchQuery(data.display_name);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      onLocationChange(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setSearchQuery(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      // Use Nominatim for forward geocoding (free OpenStreetMap service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const address = result.display_name;

        onCoordinatesChange({ lat, lng });
        onLocationChange(address);
        
        // Center map on result
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        }
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const defaultCenter = coordinates?.lat && coordinates?.lng
    ? [coordinates.lat, coordinates.lng]
    : [28.6139, 77.2090]; // Default to New Delhi

  return (
    <div style={{ width: '100%', marginBottom: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
          Search Location
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search for a location (e.g., 'New York, USA' or 'Eiffel Tower, Paris')..."
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              background: isSearching || !searchQuery.trim() ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
            }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
          💡 Tip: Use specific addresses or landmarks for better results
        </p>
      </div>
      
      <div style={{ width: '100%', height: '400px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <MapContainer
          center={defaultCenter}
          zoom={coordinates?.lat && coordinates?.lng ? 15 : 10}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {coordinates?.lat && coordinates?.lng && (
            <Marker
              position={[coordinates.lat, coordinates.lng]}
              draggable={true}
              eventHandlers={{
                dragend: async (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  await handleMapClick(position);
                },
              }}
            />
          )}
          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>
      </div>
      
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
        Click on the map or search to set location. You can also drag the marker.
        {coordinates?.lat && coordinates?.lng && (
          <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace' }}>
            ({coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)})
          </span>
        )}
      </p>
    </div>
  );
};

export default LocationPicker;
