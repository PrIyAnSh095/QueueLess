import React, { useEffect, useRef, useState } from 'react';

const buildAddressLabel = (properties = {}) => (
  [properties.name, properties.street, properties.city, properties.state, properties.country]
    .filter(Boolean)
    .join(', ')
);

const coordsLabel = (lat, lng) => `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

const LocationPicker = ({ onLocationSelect, initialLocation, initialAddress }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const onSelectRef = useRef(onLocationSelect);
  const lastLocationRef = useRef('');
  const [searchQuery, setSearchQuery] = useState(initialAddress || '');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [resolvedAddress, setResolvedAddress] = useState(initialAddress || '');

  useEffect(() => {
    onSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    setSearchQuery(initialAddress || '');
    setResolvedAddress(initialAddress || '');
  }, [initialAddress]);

  const resolveAddressFromCoords = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      return data.display_name || buildAddressLabel(data.address || {}) || `Pinned at ${coordsLabel(lat, lng)}`;
    } catch {
      return `Pinned at ${coordsLabel(lat, lng)}`;
    }
  };

  const updateMarker = async (lat, lng, providedAddress = '') => {
    const map = mapInstanceRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || lat == null || lng == null) return;

    const normalized = { lat: Number(lat), lng: Number(lng) };
    const locationKey = `${normalized.lat.toFixed(5)}:${normalized.lng.toFixed(5)}`;

    if (markerRef.current) markerRef.current.setLatLng([normalized.lat, normalized.lng]);
    else markerRef.current = leaflet.marker([normalized.lat, normalized.lng]).addTo(map);

    if (lastLocationRef.current !== locationKey) {
      map.setView([normalized.lat, normalized.lng], 15);
      lastLocationRef.current = locationKey;
    }

    const address = providedAddress || await resolveAddressFromCoords(normalized.lat, normalized.lng);
    setSelectedLocation(normalized);
    setResolvedAddress(address);
    setSearchQuery(address);
    onSelectRef.current?.({ ...normalized, address });
  };

  useEffect(() => {
    let disposed = false;

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css').catch(() => {});

      if (disposed || !mapRef.current || mapInstanceRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });

      if (mapRef.current._leaflet_id) {
        delete mapRef.current._leaflet_id;
      }

      const initialLat = Number(initialLocation?.lat ?? 20.5937);
      const initialLng = Number(initialLocation?.lng ?? 78.9629);
      const map = L.map(mapRef.current).setView([initialLat, initialLng], initialLocation ? 15 : 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      leafletRef.current = L;
      mapInstanceRef.current = map;

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        updateMarker(lat, lng);
      });

      if (initialLocation?.lat != null && initialLocation?.lng != null) {
        await updateMarker(initialLocation.lat, initialLocation.lng, initialAddress || '');
      }
    };

    initMap();

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      leafletRef.current = null;
      if (mapRef.current?._leaflet_id) {
        delete mapRef.current._leaflet_id;
      }
    };
  }, []);

  useEffect(() => {
    if (initialLocation?.lat != null && initialLocation?.lng != null && mapInstanceRef.current) {
      const nextKey = `${Number(initialLocation.lat).toFixed(5)}:${Number(initialLocation.lng).toFixed(5)}`;
      if (lastLocationRef.current !== nextKey) {
        updateMarker(initialLocation.lat, initialLocation.lng, initialAddress || resolvedAddress || '');
      }
    }
  }, [initialAddress, initialLocation?.lat, initialLocation?.lng, resolvedAddress]);

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`);
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const address = buildAddressLabel(feature.properties) || 'Selected location';
    setSuggestions([]);
    updateMarker(lat, lng, address);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSuggestions([]);
        updateMarker(coords.latitude, coords.longitude, 'Current location');
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your current location. Please check your browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="location-picker-container">
      <div className="search-box-map">
        <input
          type="text"
          placeholder="Search for address or city..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="form-input"
        />
        <button type="button" onClick={getCurrentLocation} className="btn-current-location">
          📍 Use Current Location
        </button>
        {suggestions.length > 0 && (
          <div className="map-suggestions">
            {suggestions.map((s, i) => (
              <div key={i} className="suggestion-item" onClick={() => selectSuggestion(s)}>
                {buildAddressLabel(s.properties)}
              </div>
            ))}
          </div>
        )}
      </div>
      <div ref={mapRef} style={{ height: '320px', width: 'min(100%, 760px)', borderRadius: '12px', border: '1px solid rgba(15,23,42,0.14)', margin: '0.75rem auto 0' }} />
      <div className="location-summary-box">
        <div><strong>Pin Location:</strong> {selectedLocation ? `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}` : 'Not selected'}</div>
        <div><strong>Resolved Address:</strong> {resolvedAddress || 'N/A'}</div>
        {selectedLocation && <div><a href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`} className="btn-view-doc" target="_blank" rel="noreferrer">Open in Google Maps</a></div>}
      </div>
      <p className="helper-text-reg">Search above, click on the map, or use current location to save both the pin and readable address.</p>
    </div>
  );
};

export default LocationPicker;