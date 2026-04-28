// PotholeMap.js
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Custom icons
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const getMarkerIcon = (status) => {
  if (status === 'Fixed') return greenIcon;
  if (status === 'Pending') return redIcon;
  return yellowIcon; 
};

// 🆕 NEW: The Haversine Formula to calculate distance in meters between two GPS points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

const PotholeMap = ({ userLocation, refreshTrigger }) => {
  const [reports, setReports] = useState([]);
  
  // 🆕 NEW: Driving Mode States
  const [isDriving, setIsDriving] = useState(false);
  const [liveCarLocation, setLiveCarLocation] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  
  // Keep track of potholes we already warned the user about so we don't spam the alarm
  const warnedPotholes = useRef(new Set());
  
  // Safe, free public domain beep sound
  const alarmSound = useRef(new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'));

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
  }, [refreshTrigger]);

  const processedReports = useMemo(() => {
    return reports.map(report => {
      if (!report.latitude || !report.longitude) return report;
      let lat = report.latitude;
      let lng = report.longitude;
      if (lat > 50 && lng < 40) { lat = report.longitude; lng = report.latitude; }
      const randomOffsetLat = (Math.random() - 0.5) * 0.0004;
      const randomOffsetLng = (Math.random() - 0.5) * 0.0004;
      return { ...report, displayLat: lat + randomOffsetLat, displayLng: lng + randomOffsetLng, realLat: lat, realLng: lng };
    });
  }, [reports]);

  // 🆕 NEW: Live GPS Tracking & Distance Checking Logic
  useEffect(() => {
    let watchId;
    if (isDriving && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          setLiveCarLocation([currentLat, currentLng]);

          // Check distance to all PENDING potholes
          processedReports.forEach(report => {
            if (report.status !== 'Fixed' && report.realLat && report.realLng) {
              const distance = calculateDistance(currentLat, currentLng, report.realLat, report.realLng);
              
              // If within 50 meters and we haven't warned about this exact pothole yet!
              if (distance < 50 && !warnedPotholes.current.has(report._id)) {
                warnedPotholes.current.add(report._id); // Mark as warned
                
                // Play sound and show popup!
                alarmSound.current.play().catch(e => console.log("Audio play blocked by browser", e));
                setAlertMessage(`⚠️ HAZARD AHEAD: Pothole detected ${Math.round(distance)} meters away!`);
                
                // Hide the popup after 5 seconds
                setTimeout(() => setAlertMessage(null), 5000);
              }
            }
          });
        },
        (error) => console.error("GPS Tracking Error:", error),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isDriving, processedReports]);

  // Determine where the map should center
  const mapCenter = isDriving && liveCarLocation 
    ? liveCarLocation 
    : (userLocation ? [userLocation.lat, userLocation.lng] : [12.3059, 76.6086]);

  return (
    <div style={{ position: 'relative', width: '100%', marginTop: '20px' }}>
      
      {/* 🆕 NEW: Driving Mode Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button 
          onClick={() => setIsDriving(!isDriving)}
          style={{ padding: '10px 20px', backgroundColor: isDriving ? '#ff4d4d' : '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
        >
          {isDriving ? '🛑 Stop Driving Mode' : '🚗 Start Driving Mode'}
        </button>
        {isDriving && <span style={{ color: '#4CAF50', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>📍 Live GPS Active</span>}
      </div>

      {/* 🆕 NEW: Hazard Alert Popup */}
      {alertMessage && (
        <div style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#ff4d4d', color: '#fff', padding: '15px 30px', borderRadius: '8px', zIndex: 1000, fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 8px 16px rgba(255, 77, 77, 0.4)', border: '2px solid #fff', textAlign: 'center', width: '80%', maxWidth: '400px' }}>
          {alertMessage}
        </div>
      )}

      <div className="map-container" style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid #333' }}>
        <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
          <ChangeMapView center={mapCenter} zoom={isDriving ? 17 : 14} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render the Potholes */}
          {processedReports.map((report, index) => {
            if (report.displayLat && report.displayLng) {
              return (
                <Marker key={report._id || index} position={[report.displayLat, report.displayLng]} icon={getMarkerIcon(report.status)}>
                  <Popup>
                    <strong>Status:</strong> {report.status} <br/>
                    <strong>Potholes Found:</strong> {report.pothole_count} <br/>
                    <strong>Reported on:</strong> {new Date(report.reported_at).toLocaleDateString()}
                  </Popup>
                </Marker>
              );
            }
            return null; 
          })}

          {/* 🆕 NEW: Draw the user's Live Car Location as a Blue Circle */}
          {isDriving && liveCarLocation && (
            <CircleMarker 
              center={liveCarLocation} 
              radius={12} 
              pathOptions={{ color: '#007bff', fillColor: '#007bff', fillOpacity: 0.8, weight: 2 }}
            >
              <Popup>Your current location</Popup>
            </CircleMarker>
          )}

        </MapContainer>
      </div>
      
      {/* Small animation style for the Live GPS text */}
      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }`}</style>
    </div>
  );
};

export default PotholeMap;

// work// PotholeMap.js
// import React, { useEffect, useState, useMemo } from 'react';
// import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
// import L from 'leaflet';

// const redIcon = new L.Icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const greenIcon = new L.Icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const yellowIcon = new L.Icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const getMarkerIcon = (status) => {
//   if (status === 'Fixed') return greenIcon;
//   if (status === 'Pending') return redIcon;
//   return yellowIcon; 
// };

// function ChangeMapView({ center, zoom }) {
//   const map = useMap();
//   map.setView(center, zoom);
//   return null;
// }

// const PotholeMap = ({ userLocation, refreshTrigger }) => {
//   const [reports, setReports] = useState([]);

//   useEffect(() => {
//     const fetchReports = async () => {
//       try {
//         const response = await fetch('http://127.0.0.1:5000/api/reports');
//         const data = await response.json();
//         setReports(data);
//       } catch (error) {
//         console.error("Error fetching reports:", error);
//       }
//     };
//     fetchReports();
//   }, [refreshTrigger]); // 👈 🆕 NEW: Now it fetches again whenever this number changes!

//   const mapCenter = userLocation 
//     ? [userLocation.lat, userLocation.lng] 
//     : [12.3059, 76.6086]; // Default to Mysuru!

//   // 🆕 NEW: Process the reports to fix swapped coords and add jitter
//   const processedReports = useMemo(() => {
//     return reports.map(report => {
//       if (!report.latitude || !report.longitude) return report;

//       let lat = report.latitude;
//       let lng = report.longitude;

//       // FIX 1: If latitude is strangely high (like 76) and longitude is low (like 12), they are swapped!
//       if (lat > 50 && lng < 40) {
//         lat = report.longitude;
//         lng = report.latitude;
//       }

//       // FIX 2: Add a tiny random offset (about 10-20 meters) so pins don't stack perfectly on top of each other
//       // We use the report._id to seed the random number so they don't "dance" every time the map moves
//       const randomOffsetLat = (Math.random() - 0.5) * 0.0004;
//       const randomOffsetLng = (Math.random() - 0.5) * 0.0004;

//       return {
//         ...report,
//         displayLat: lat + randomOffsetLat,
//         displayLng: lng + randomOffsetLng
//       };
//     });
//   }, [reports]);

//   return (
//     <div className="map-container" style={{ height: '500px', width: '100%', marginTop: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #333' }}>
//       <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        
//         <ChangeMapView center={mapCenter} zoom={13} />

//         <TileLayer
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {/* 🆕 NEW: Map over our processed reports with the display coordinates */}
//         {processedReports.map((report, index) => {
//           if (report.displayLat && report.displayLng) {
//             return (
//               <Marker 
//                 key={report._id || index} 
//                 position={[report.displayLat, report.displayLng]}
//                 icon={getMarkerIcon(report.status)} 
//               >
//                 <Popup>
//                   <strong>Status:</strong> {report.status} <br/>
//                   <strong>Potholes Found:</strong> {report.pothole_count} <br/>
//                   <strong>Reported on:</strong> {new Date(report.reported_at).toLocaleDateString()}
//                 </Popup>
//               </Marker>
//             );
//           }
//           return null; 
//         })}
//       </MapContainer>
//     </div>
//   );
// };

// export default PotholeMap;

// working// PotholeMap.js
// import React, { useEffect, useState } from 'react';
// import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
// import L from 'leaflet';

// // 🆕 NEW: Define our custom colored map markers!
// const redIcon = new L.Icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const greenIcon = new L.Icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// const yellowIcon = new L.Icon({
//   iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
//   iconSize: [25, 41],
//   iconAnchor: [12, 41],
//   popupAnchor: [1, -34],
//   shadowSize: [41, 41]
// });

// // 🆕 NEW: Helper function to pick the right color based on status
// const getMarkerIcon = (status) => {
//   if (status === 'Fixed') return greenIcon;
//   if (status === 'Pending') return redIcon;
//   return yellowIcon; // Fallback for "In Progress"
// };

// function ChangeMapView({ center, zoom }) {
//   const map = useMap();
//   map.setView(center, zoom);
//   return null;
// }

// const PotholeMap = ({ userLocation }) => {
//   const [reports, setReports] = useState([]);

//   useEffect(() => {
//     const fetchReports = async () => {
//       try {
//         const response = await fetch('http://127.0.0.1:5000/api/reports');
//         const data = await response.json();
//         setReports(data);
//       } catch (error) {
//         console.error("Error fetching reports:", error);
//       }
//     };
//     fetchReports();
//   }, []); // Note: You might need to refresh the page to see newly added reports on the map

//   const mapCenter = userLocation 
//     ? [userLocation.lat, userLocation.lng] 
//     : [12.2958, 76.6393]; // Default fallback

//   return (
//     <div className="map-container" style={{ height: '500px', width: '100%', marginTop: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #333' }}>
//       <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        
//         <ChangeMapView center={mapCenter} zoom={13} />

//         <TileLayer
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {/* 🆕 NEW: Loop through reports and apply the specific icon */}
//         {reports.map((report, index) => {
//           if (report.latitude && report.longitude) {
//             return (
//               <Marker 
//                 key={report._id || index} 
//                 position={[report.latitude, report.longitude]}
//                 icon={getMarkerIcon(report.status)} // 👈 Apply color logic here!
//               >
//                 <Popup>
//                   <strong>Status:</strong> {report.status} <br/>
//                   <strong>Potholes Found:</strong> {report.pothole_count} <br/>
//                   <strong>Reported on:</strong> {new Date(report.reported_at).toLocaleDateString()}
//                 </Popup>
//               </Marker>
//             );
//           }
//           return null; 
//         })}
//       </MapContainer>
//     </div>
//   );
// };

// export default PotholeMap;

// // PotholeMap.js
// import React, { useEffect, useState } from 'react';
// // 🆕 NEW: Import 'useMap' from react-leaflet
// import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
// import L from 'leaflet';

// import icon from 'leaflet/dist/images/marker-icon.png';
// import iconShadow from 'leaflet/dist/images/marker-shadow.png';
// let DefaultIcon = L.icon({
//     iconUrl: icon,
//     shadowUrl: iconShadow,
//     iconSize: [25, 41],
//     iconAnchor: [12, 41]
// });
// L.Marker.prototype.options.icon = DefaultIcon;

// // 🆕 NEW: A small helper component to move the map camera dynamically
// function ChangeMapView({ center, zoom }) {
//   const map = useMap();
//   map.setView(center, zoom);
//   return null;
// }

// // 🆕 NEW: Accept userLocation as a prop from App.js
// const PotholeMap = ({ userLocation }) => {
//   const [reports, setReports] = useState([]);

//   useEffect(() => {
//     const fetchReports = async () => {
//       try {
//         const response = await fetch('http://127.0.0.1:5000/api/reports');
//         const data = await response.json();
//         setReports(data);
//       } catch (error) {
//         console.error("Error fetching reports:", error);
//       }
//     };
//     fetchReports();
//   }, []);

//   // 🆕 NEW: If we have a user location, use it! Otherwise, default to New Delhi.
//   const mapCenter = userLocation 
//     ? [userLocation.lat, userLocation.lng] 
//     : [28.6139, 77.2090];

//   return (
//     <div className="map-container" style={{ height: '500px', width: '100%', marginTop: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #333' }}>
//       <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        
//         {/* 🆕 NEW: This helper actually moves the camera when mapCenter changes */}
//         <ChangeMapView center={mapCenter} zoom={13} />

//         <TileLayer
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {reports.map((report, index) => {
//           // If the report has real coordinates, use them!
//           if (report.latitude && report.longitude) {
//             return (
//               <Marker key={report._id || index} position={[report.latitude, report.longitude]}>
//                 <Popup>
//                   <strong>Status:</strong> {report.status} <br/>
//                   <strong>Potholes Found:</strong> {report.pothole_count} <br/>
//                   <strong>Reported on:</strong> {new Date(report.reported_at).toLocaleDateString()}
//                 </Popup>
//               </Marker>
//             );
//           }
//           return null; // Don't render if there are no coordinates
//         })}
//       </MapContainer>
//     </div>
//   );
// };

// export default PotholeMap;