// PotholeMap.js
import React, { useEffect, useState } from 'react';
// 🆕 NEW: Import 'useMap' from react-leaflet
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 🆕 NEW: A small helper component to move the map camera dynamically
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// 🆕 NEW: Accept userLocation as a prop from App.js
const PotholeMap = ({ userLocation }) => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/reports');
        const data = await response.json();
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };
    fetchReports();
  }, []);

  // 🆕 NEW: If we have a user location, use it! Otherwise, default to New Delhi.
  const mapCenter = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [28.6139, 77.2090];

  return (
    <div className="map-container" style={{ height: '500px', width: '100%', marginTop: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #333' }}>
      <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        
        {/* 🆕 NEW: This helper actually moves the camera when mapCenter changes */}
        <ChangeMapView center={mapCenter} zoom={13} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map((report, index) => {
          // If the report has real coordinates, use them!
          if (report.latitude && report.longitude) {
            return (
              <Marker key={report._id || index} position={[report.latitude, report.longitude]}>
                <Popup>
                  <strong>Status:</strong> {report.status} <br/>
                  <strong>Potholes Found:</strong> {report.pothole_count} <br/>
                  <strong>Reported on:</strong> {new Date(report.reported_at).toLocaleDateString()}
                </Popup>
              </Marker>
            );
          }
          return null; // Don't render if there are no coordinates
        })}
      </MapContainer>
    </div>
  );
};

export default PotholeMap;