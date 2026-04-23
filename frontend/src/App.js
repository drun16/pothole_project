// App.js
import React, { useState, useEffect } from 'react';
import PotholeMap from './PotholeMap';
import LiveCamera from './LiveCamera';
import AdminDashboard from './AdminDashboard';
import './App.css';

function App() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'upload', 'live', 'map', 'admin'
  
  // Global Stats for Navbar
  const [globalStats, setGlobalStats] = useState({ total: 0, pending: 0, fixed: 0 });
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  // Upload States
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [email, setEmail] = useState('');

  // Fetch Global Stats
  const fetchStats = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/reports');
      const data = await response.json();
      setGlobalStats({
        total: data.length,
        pending: data.filter(r => r.status === 'Pending').length,
        fixed: data.filter(r => r.status === 'Fixed').length
      });
    } catch (error) {
      console.error("Error fetching global stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentPage, mapRefreshKey]); // Refresh stats when changing pages or uploading

  // Upload Logic
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResults(null);
    }
  };

  const getLocation = () => {
    setLocationStatus('Locating...');
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported');
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLocationStatus('📍 Location captured!');
        },
        () => setLocationStatus('❌ Unable to retrieve location')
      );
    }
  };

  const handleUpload = async () => {
    if (!image) return alert('Please select an image first!');
    setLoading(true);
    const formData = new FormData();
    formData.append('file', image);
    formData.append('source', 'upload');
    if (location) {
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);
    }
    if (email) formData.append('email', email);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/detect', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResults(data);
      fetchStats(); // Update navbar
      setMapRefreshKey(prev => prev + 1); // Update map
      if (data.message) alert('Report submitted successfully!');
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      {/* 🆕 NEW: Global Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setCurrentPage('home')}>
          <span style={{ fontSize: '1.8rem' }}>🚧</span>
          <h1>Pothole Patrol</h1>
        </div>
        <div className="nav-stats">
          <div className="stat-badge total">Total Found: <span>{globalStats.total}</span></div>
          <div className="stat-badge fixed">Roads Fixed: <span>{globalStats.fixed}</span></div>
          <div className="stat-badge pending">Pending: <span>{globalStats.pending}</span></div>
        </div>
      </nav>

      {/* 🆕 NEW: Routing Logic - Render pages based on state */}
      <main className="main-content">
        
        {/* PAGE 1: HOME */}
        {currentPage === 'home' && (
          <div className="hero-section page-container">
            <h2>Making Roads <span>Safer</span> with AI</h2>
            <p>Our smart platform detects, maps, and reports road hazards in real-time. Choose a module below to get started.</p>
            
            <div className="circle-nav-grid">
              <div className="circle-btn-wrapper" onClick={() => setCurrentPage('upload')}>
                <div className="circle-btn"><span className="circle-icon">📤</span></div>
                <span className="circle-label">Manual Report</span>
              </div>
              <div className="circle-btn-wrapper" onClick={() => setCurrentPage('live')}>
                <div className="circle-btn"><span className="circle-icon">📷</span></div>
                <span className="circle-label">Live Dashcam</span>
              </div>
              <div className="circle-btn-wrapper" onClick={() => setCurrentPage('map')}>
                <div className="circle-btn"><span className="circle-icon">🗺️</span></div>
                <span className="circle-label">Smart Map</span>
              </div>
              <div className="circle-btn-wrapper" onClick={() => setCurrentPage('admin')}>
                <div className="circle-btn"><span className="circle-icon">🔐</span></div>
                <span className="circle-label">Authority Portal</span>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: MANUAL UPLOAD */}
        {currentPage === 'upload' && (
          <div className="page-container">
            <button onClick={() => setCurrentPage('home')} style={{ marginBottom: '20px', background: 'none', color: '#FFD700', border: '1px solid #FFD700', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>← Back to Home</button>
            <div className="upload-section">
              <h2>Report a Pothole</h2>
              <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
              
              <div style={{ margin: '15px 0' }}>
                <button onClick={getLocation} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}>📍 Get My Location</button>
                <p style={{ color: '#FFD700', margin: '10px 0' }}>{locationStatus}</p>
              </div>

              <div style={{ margin: '15px 0', textAlign: 'left', width: '100%', maxWidth: '300px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#aaaaaa' }}>Notify me when fixed:</label>
                <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }} />
              </div>

              {preview && <div className="image-preview"><img src={preview} alt="Road preview" /></div>}

              <button onClick={handleUpload} disabled={!image || loading} className="upload-btn">
                {loading ? 'Analyzing with AI...' : 'Detect Potholes'}
              </button>
            </div>

            {results && (
              <div className="results-section" style={{ marginTop: '20px' }}>
                <h2>Detection Results</h2>
                <h3>Potholes Detected: <span className="highlight">{results.pothole_count}</span></h3>
              </div>
            )}
          </div>
        )}

        {/* PAGE 3: LIVE CAMERA */}
        {currentPage === 'live' && (
          <div className="page-container" style={{ width: '100%' }}>
            <button onClick={() => setCurrentPage('home')} style={{ marginBottom: '20px', background: 'none', color: '#FFD700', border: '1px solid #FFD700', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>← Back to Home</button>
            <LiveCamera onPotholeLogged={() => {
              setMapRefreshKey(prev => prev + 1);
              fetchStats();
            }} />
          </div>
        )}

        {/* PAGE 4: SMART MAP */}
        {currentPage === 'map' && (
          <div className="page-container" style={{ width: '100%', maxWidth: '1000px' }}>
            <button onClick={() => setCurrentPage('home')} style={{ marginBottom: '20px', background: 'none', color: '#FFD700', border: '1px solid #FFD700', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>← Back to Home</button>
            <h2 style={{ color: '#FFD700', margin: 0 }}>City-Wide Pothole Map</h2>
            <PotholeMap userLocation={location} refreshTrigger={mapRefreshKey} />
          </div>
        )}

        {/* PAGE 5: ADMIN DASHBOARD */}
        {currentPage === 'admin' && (
          <div className="page-container" style={{ width: '100%' }}>
            <button onClick={() => setCurrentPage('home')} style={{ marginBottom: '20px', background: 'none', color: '#FFD700', border: '1px solid #FFD700', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>← Back to Home</button>
            <AdminDashboard />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;

// // App.js
// import React, { useState } from 'react';
// import PotholeMap from './PotholeMap'; // Our map from the previous step!
// import './App.css';
// import AdminDashboard from './AdminDashboard';
// import LiveCamera from './LiveCamera';

// function App() {
//   const [image, setImage] = useState(null);
//   const [preview, setPreview] = useState(null);
//   const [results, setResults] = useState(null);
//   const [loading, setLoading] = useState(false);
  
//   // 🆕 NEW: State to hold the GPS coordinates
//   const [location, setLocation] = useState(null);
//   const [locationStatus, setLocationStatus] = useState('');
//   const [view, setView] = useState('user'); // Can be 'user' or 'admin'
//   const [email, setEmail] = useState('');
//   const [inputMode, setInputMode] = useState('upload'); // 'upload' or 'live'
//   const [mapRefreshKey, setMapRefreshKey] = useState(0);

//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setImage(file);
//       setPreview(URL.createObjectURL(file));
//       setResults(null);
//     }
//   };

//   // 🆕 NEW: Function to ask the browser for GPS coordinates
//   const getLocation = () => {
//     setLocationStatus('Locating...');
//     if (!navigator.geolocation) {
//       setLocationStatus('Geolocation is not supported by your browser');
//     } else {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           setLocation({
//             lat: position.coords.latitude,
//             lng: position.coords.longitude
//           });
//           setLocationStatus('📍 Location captured!');
//         },
//         () => {
//           setLocationStatus('❌ Unable to retrieve your location');
//         }
//       );
//     }
//   };

//   const handleUpload = async () => {
//     if (!image) return alert('Please select an image first!');
    
//     setLoading(true);
//     const formData = new FormData();
//     formData.append('file', image);
    
//     // 🆕 NEW: If we have a location, attach it to the data sent to the backend
//     if (location) {
//       formData.append('latitude', location.lat);
//       formData.append('longitude', location.lng);
//     }
    
//     if (email) {
//       formData.append('email', email); // 🆕 NEW: Send email to backend
//     }

//     try {
//       const response = await fetch('http://127.0.0.1:5000/api/detect', {
//         method: 'POST',
//         body: formData,
//       });
      
//       const data = await response.json();
//       setResults(data);
      
//       // Bonus: Alert the user if it succeeded!
//       if (data.message) alert('Report submitted successfully!');
      
//     } catch (error) {
//       console.error('Error uploading:', error);
//       alert('Failed to connect to the server.');
//     } finally {
//       setLoading(false);
//     }
//   };
//   return (
//     <div className="App">
//       <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
//         <div style={{ textAlign: 'left' }}>
//           <h1>🚧 Pothole Patrol 🚧</h1>
//           <p>Smart Road Maintenance & Detection</p>
//         </div>
        
//         {/* 🆕 NEW: Navigation Toggle */}
//         <button 
//           onClick={() => setView(view === 'user' ? 'admin' : 'user')}
//           style={{ padding: '10px 20px', backgroundColor: '#333', color: '#FFD700', border: '1px solid #FFD700', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
//         >
//           Switch to {view === 'user' ? 'Admin View' : 'User View'}
//         </button>
//       </header>

//       <main className="main-content">
        
//         {/* If view is 'admin', show the Dashboard. Otherwise, show the Upload/Map tools */}
//         {view === 'admin' ? (
//           <AdminDashboard />
//         ) : (
//           <>
//           {/* 🆕 NEW: Input Mode Tabs */}
//             <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
//               <button 
//                 onClick={() => setInputMode('upload')}
//                 style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: inputMode === 'upload' ? '#FFD700' : '#333', color: inputMode === 'upload' ? '#000' : '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
//               >
//                 📤 Upload Image
//               </button>
//               <button 
//                 onClick={() => setInputMode('live')}
//                 style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: inputMode === 'live' ? '#FFD700' : '#333', color: inputMode === 'live' ? '#000' : '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
//               >
//                 📷 Live Scanner
//               </button>
//             </div>

//             {/* Conditionally Render the chosen mode */}
//             {inputMode === 'live' ? (
//               /* 🆕 NEW: Pass the refresh function to the camera */
//               <LiveCamera onPotholeLogged={() => setMapRefreshKey(prev => prev + 1)} />
              
//             ) : (
//               <div className="upload-section">
//                  {/* ... all your existing upload section code ... */}
//               </div>
//             )}
//             {/* ... Paste your existing Upload Section, Results Section, and Map Section here ... */}
//             <div className="upload-section">
//               <h2>Report a Pothole</h2>
//               <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
//               {/* 🆕 NEW: Email Input for Notifications */}
//           <div style={{ margin: '15px 0', textAlign: 'left', width: '100%', maxWidth: '300px' }}>
//             <label style={{ display: 'block', marginBottom: '5px', color: '#aaaaaa' }}>Notify me when fixed (optional):</label>
//             <input 
//               type="email" 
//               placeholder="Enter your email" 
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#333', color: '#fff' }}
//             />
//           </div>

//               <div style={{ margin: '15px 0' }}>
//                 <button onClick={getLocation} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}>
//                   📍 Get My Location
//                 </button>
//                 <p style={{ color: '#FFD700', margin: '10px 0' }}>{locationStatus}</p>
//               </div>

//               {preview && (
//                 <div className="image-preview">
//                   <img src={preview} alt="Road preview" />
//                 </div>
//               )}

//               <button onClick={handleUpload} disabled={!image || loading} className="upload-btn">
//                 {loading ? 'Analyzing with AI...' : 'Detect Potholes'}
//               </button>
//             </div>

//             {results && (
//               <div className="results-section">
//                 <h2>Detection Results</h2>
//                 <div className="stats-card">
//                   <h3>Total Potholes Detected: <span className="highlight">{results.pothole_count}</span></h3>
//                   {results.pothole_count > 0 ? (
//                     <ul className="detection-list">
//                       {results.detections.map((det, index) => (
//                         <li key={index}>
//                           Pothole {index + 1} - AI Confidence: {(det.confidence * 100).toFixed(0)}%
//                         </li>
//                       ))}
//                     </ul>
//                   ) : (
//                     <p className="success">🎉 No potholes detected! The road looks safe.</p>
//                   )}
//                 </div>
//               </div>
//             )}

//             <div className="map-section" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
//               <h2 style={{ color: '#FFD700', marginTop: '40px' }}>Live Pothole Map</h2>
//               { /* 🆕 NEW: Give the map the refresh trigger */ }
//               <PotholeMap userLocation={location} refreshTrigger={mapRefreshKey} />
//             </div>
//           </>
//         )}
//       </main>
//     </div>
//   );

//   // return (
//   //   <div className="App">
//   //     <header className="header">
//   //       <h1>🚧 Pothole Patrol 🚧</h1>
//   //       <p>Smart Road Maintenance & Detection</p>
//   //     </header>

//   //     <main className="main-content">
//   //       <div className="upload-section">
//   //         <h2>Report a Pothole</h2>
//   //         <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
          
//   //         {/* 🆕 NEW: Location Button */}
//   //         <div style={{ margin: '15px 0' }}>
//   //           <button onClick={getLocation} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '4px' }}>
//   //             📍 Get My Location
//   //           </button>
//   //           <p style={{ color: '#FFD700', margin: '10px 0' }}>{locationStatus}</p>
//   //         </div>

//   //         {preview && (
//   //           <div className="image-preview">
//   //             <img src={preview} alt="Road preview" />
//   //           </div>
//   //         )}

//   //         <button onClick={handleUpload} disabled={!image || loading} className="upload-btn">
//   //           {loading ? 'Analyzing with AI...' : 'Detect Potholes'}
//   //         </button>
//   //       </div>

//   //       {results && (
//   //         <div className="results-section">
//   //           <h2>Detection Results</h2>
//   //           <div className="stats-card">
//   //             <h3>Total Potholes Detected: <span className="highlight">{results.pothole_count}</span></h3>
//   //             {results.pothole_count > 0 ? (
//   //               <ul className="detection-list">
//   //                 {results.detections.map((det, index) => (
//   //                   <li key={index}>
//   //                     Pothole {index + 1} - AI Confidence: {(det.confidence * 100).toFixed(0)}%
//   //                   </li>
//   //                 ))}
//   //               </ul>
//   //             ) : (
//   //               <p className="success">🎉 No potholes detected! The road looks safe.</p>
//   //             )}
//   //           </div>
//   //         </div>
//   //       )}

//   //       {/* The Smart Map */}
//   //       <div className="map-section" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
//   //         <h2 style={{ color: '#FFD700', marginTop: '40px' }}>Live Pothole Map</h2>
//   //         <PotholeMap />
//   //       </div>
//   //     </main>
//   //   </div>
//   // );
// }

// export default App;