import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in Leaflet + React
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function CenterMap({ coords }) {
    const map = useMap();
    useEffect(() => {
        if (coords) map.setView(coords, 13);
    }, [coords, map]);
    return null;
}

export default function LocationPicker({ value, onChange }) {
  const [position, setPosition] = useState(value || null);

  useEffect(() => {
    if (value) setPosition(value);
  }, [value]);

  const handleDetect = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        onChange(newPos);
      });
    }
  };

  return (
    <div className="location-picker">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <button type="button" className="btn-secondary" onClick={handleDetect} style={{padding: '5px 10px', fontSize: '0.8em'}}>
           Auto-Detect My Location
        </button>
        {position && <span style={{fontSize: '0.8em', color: '#64748b'}}>{position.lat.toFixed(4)}, {position.lng.toFixed(4)}</span>}
      </div>
      <div style={{ height: "300px", borderRadius: "10px", overflow: "hidden", border: '1px solid #e2e8f0' }}>
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationMarker position={position} setPosition={(pos) => { setPosition(pos); onChange(pos); }} />
          {position && <CenterMap coords={position} />}
        </MapContainer>
      </div>
      <p style={{fontSize: '0.75em', color: '#94a3b8', marginTop: '5px'}}>Click on the map to manually adjust location.</p>
    </div>
  );
}
