import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';

// 🆕 NEW: Accept a callback prop to tell App.js when to refresh the map
const LiveCamera = ({ onPotholeLogged }) => {
  const webcamRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [liveResults, setLiveResults] = useState(null);
  
  // 🆕 NEW: State to hold the live, constantly updating car location
  const [liveLocation, setLiveLocation] = useState(null);

  // 🆕 NEW: Start tracking GPS coordinates continuously as the user moves
  useEffect(() => {
    let watchId;
    if (isDetecting && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLiveLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error("GPS Tracking Error:", error),
        { enableHighAccuracy: true, maximumAge: 0 } // Request highly accurate mobile GPS
      );
    }
    // Cleanup GPS tracker when stopping the camera
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isDetecting]);

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    const res = await fetch(imageSrc);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append('file', blob, 'webcam_frame.jpg');
    
    // 🆕 NEW: Tell the backend this is a live feed, and attach the moving coordinates!
    formData.append('source', 'live');
    if (liveLocation) {
      formData.append('latitude', liveLocation.lat);
      formData.append('longitude', liveLocation.lng);
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/detect', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setLiveResults(data);

      // 🆕 NEW: If the backend actually saved a pothole, tell the Map to refresh immediately!
      if (data.saved_to_db && data.pothole_count > 0) {
        onPotholeLogged();
      }

    } catch (error) {
      console.error('Live detection error:', error);
    }
  }, [webcamRef, liveLocation, onPotholeLogged]);

  useEffect(() => {
    let interval;
    if (isDetecting) {
      interval = setInterval(captureAndDetect, 2500); // Scans every 2.5 seconds
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isDetecting, captureAndDetect]);

  return (
    <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '12px', border: '2px solid #333', marginTop: '20px' }}>
      <h2 style={{ color: '#FFD700', marginTop: 0 }}>📷 Live AI Scanner</h2>
      
      {/* 🆕 NEW: Display the active GPS tracker status */}
      <p style={{ color: liveLocation ? '#4CAF50' : '#ff4d4d', fontSize: '0.9rem' }}>
        {liveLocation ? `📍 GPS Active tracking: ${liveLocation.lat.toFixed(4)}, ${liveLocation.lng.toFixed(4)}` : '⚠️ Waiting for GPS signal...'}
      </p>

      <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto', overflow: 'hidden', borderRadius: '8px', border: '2px dashed #FFD700' }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width="100%"
          videoConstraints={{ facingMode: "environment" }}
        />
      </div>

      <button 
        onClick={() => setIsDetecting(!isDetecting)}
        style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: isDetecting ? '#ff4d4d' : '#FFD700', color: '#121212', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
      >
        {isDetecting ? '🛑 Stop Scanner' : '🟢 Start Live Scanner'}
      </button>

      {isDetecting && liveResults && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: liveResults.pothole_count > 0 ? '#ff4d4d' : '#4CAF50' }}>
            Live Status: {liveResults.pothole_count > 0 ? `${liveResults.pothole_count} Potholes Detected & Mapped!` : 'Road Clear'}
          </h3>
        </div>
      )}
    </div>
  );
};

export default LiveCamera;

// import React, { useRef, useState, useEffect, useCallback } from 'react';
// import Webcam from 'react-webcam';

// const LiveCamera = () => {
//   const webcamRef = useRef(null);
//   const [isDetecting, setIsDetecting] = useState(false);
//   const [liveResults, setLiveResults] = useState(null);

//   const captureAndDetect = useCallback(async () => {
//     if (!webcamRef.current) return;
    
//     // Capture a frame from the webcam as a base64 image
//     const imageSrc = webcamRef.current.getScreenshot();
//     if (!imageSrc) return;

//     // Convert the base64 string into a file object so Flask can read it
//     const res = await fetch(imageSrc);
//     const blob = await res.blob();
//     const formData = new FormData();
//     formData.append('file', blob, 'webcam_frame.jpg');

//     try {
//       // Send the frame to our existing Python AI endpoint!
//       const response = await fetch('http://127.0.0.1:5000/api/detect', {
//         method: 'POST',
//         body: formData,
//       });
//       const data = await response.json();
//       setLiveResults(data);
//     } catch (error) {
//       console.error('Live detection error:', error);
//     }
//   }, [webcamRef]);

//   // Run the detection loop every 2.5 seconds if the user clicked "Start"
//   useEffect(() => {
//     let interval;
//     if (isDetecting) {
//       interval = setInterval(captureAndDetect, 2500);
//     } else {
//       clearInterval(interval);
//     }
//     return () => clearInterval(interval);
//   }, [isDetecting, captureAndDetect]);

//   return (
//     <div style={{ backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '12px', border: '2px solid #333', marginTop: '20px' }}>
//       <h2 style={{ color: '#FFD700', marginTop: 0 }}>📷 Live AI Scanner</h2>
      
//       <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto', overflow: 'hidden', borderRadius: '8px', border: '2px dashed #FFD700' }}>
//         <Webcam
//           audio={false}
//           ref={webcamRef}
//           screenshotFormat="image/jpeg"
//           width="100%"
//           videoConstraints={{ facingMode: "environment" }} // Tries to use back camera on mobile
//         />
//       </div>

//       <button 
//         onClick={() => setIsDetecting(!isDetecting)}
//         style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: isDetecting ? '#ff4d4d' : '#FFD700', color: '#121212', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
//       >
//         {isDetecting ? '🛑 Stop Scanner' : '🟢 Start Live Scanner'}
//       </button>

//       {/* Show real-time results below the camera */}
//       {isDetecting && liveResults && (
//         <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '6px' }}>
//           <h3 style={{ margin: '0 0 10px 0', color: liveResults.pothole_count > 0 ? '#ff4d4d' : '#4CAF50' }}>
//             Live Status: {liveResults.pothole_count > 0 ? `${liveResults.pothole_count} Potholes Detected!` : 'Road Clear'}
//           </h3>
//         </div>
//       )}
//     </div>
//   );
// };

// export default LiveCamera;