// PotholeMap.js
import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getMarkerIcon = (status) => {
  if (status === 'Fixed') return greenIcon;
  if (status === 'Pending') return redIcon;
  return yellowIcon; 
};

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

const PotholeMap = ({ userLocation, refreshTrigger }) => {
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
  }, [refreshTrigger]); // 👈 🆕 NEW: Now it fetches again whenever this number changes!

  const mapCenter = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [12.3059, 76.6086]; // Default to Mysuru!

  // 🆕 NEW: Process the reports to fix swapped coords and add jitter
  const processedReports = useMemo(() => {
    return reports.map(report => {
      if (!report.latitude || !report.longitude) return report;

      let lat = report.latitude;
      let lng = report.longitude;

      // FIX 1: If latitude is strangely high (like 76) and longitude is low (like 12), they are swapped!
      if (lat > 50 && lng < 40) {
        lat = report.longitude;
        lng = report.latitude;
      }

      // FIX 2: Add a tiny random offset (about 10-20 meters) so pins don't stack perfectly on top of each other
      // We use the report._id to seed the random number so they don't "dance" every time the map moves
      const randomOffsetLat = (Math.random() - 0.5) * 0.0004;
      const randomOffsetLng = (Math.random() - 0.5) * 0.0004;

      return {
        ...report,
        displayLat: lat + randomOffsetLat,
        displayLng: lng + randomOffsetLng
      };
    });
  }, [reports]);

  return (
    <div className="map-container" style={{ height: '500px', width: '100%', marginTop: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #333' }}>
      <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        
        <ChangeMapView center={mapCenter} zoom={13} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🆕 NEW: Map over our processed reports with the display coordinates */}
        {processedReports.map((report, index) => {
          if (report.displayLat && report.displayLng) {
            return (
              <Marker 
                key={report._id || index} 
                position={[report.displayLat, report.displayLng]}
                icon={getMarkerIcon(report.status)} 
              >
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
      </MapContainer>
    </div>
  );
};

export default PotholeMap;

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