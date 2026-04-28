// AdminDashboard.js
import React, { useEffect, useState } from 'react';
// 🆕 NEW: Import PDF libraries
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // 🆕 NEW: Import autoTable as a specific function

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);

  const fetchReports = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/reports');
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      await fetch(`http://127.0.0.1:5000/api/reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchReports();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // 🆕 NEW: Function to generate and download the PDF
  // 🆕 NEW: Updated function to generate and download the PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add a title to the PDF
    doc.text("Pothole Patrol - Official Authority Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    // Prepare the table data
    const tableColumn = ["Date", "Potholes Found", "Coordinates", "Status"];
    const tableRows = [];

    reports.forEach(report => {
      const reportData = [
        new Date(report.reported_at).toLocaleDateString(),
        report.pothole_count,
        report.latitude ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}` : 'Unknown',
        report.status
      ];
      tableRows.push(reportData);
    });

    // 🆕 NEW: Pass 'doc' as the first argument to autoTable!
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [255, 215, 0], textColor: [0, 0, 0] } // Yellow header
    });

    // Download the file
    doc.save("Pothole_Report.pdf");
  };

  const totalReports = reports.length;
  const pendingReports = reports.filter(r => r.status === 'Pending').length;
  const fixedReports = reports.filter(r => r.status === 'Fixed').length;

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      
      {/* 🆕 NEW: Header with the Download Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
        <h2 style={{ color: '#FFD700', margin: 0 }}>Authority Dashboard</h2>
        <button 
          onClick={downloadPDF}
          style={{ backgroundColor: '#FFD700', color: '#121212', border: 'none', padding: '10px 20px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}
        >
          📄 Download PDF Report
        </button>
      </div>

      {/* Analytics Cards */}
      {/* 🆕 NEW: Added flexWrap: 'wrap' to the container so cards stack on mobile */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', marginTop: '20px', flexWrap: 'wrap' }}>
        
        {/* 🆕 NEW: Changed flex: 1 to flex: '1 1 200px' so they know when to wrap */}
        <div style={{ flex: '1 1 200px', backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
          <h3>Total Reports</h3>
          <p style={{ fontSize: '2rem', color: '#FFD700', margin: 0 }}>{totalReports}</p>
        </div>
        
        <div style={{ flex: '1 1 200px', backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
          <h3>Pending Action</h3>
          <p style={{ fontSize: '2rem', color: '#ff4d4d', margin: 0 }}>{pendingReports}</p>
        </div>
        
        <div style={{ flex: '1 1 200px', backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
          <h3>Potholes Fixed</h3>
          <p style={{ fontSize: '2rem', color: '#4CAF50', margin: 0 }}>{fixedReports}</p>
        </div>
      </div>
      {/* <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', marginTop: '20px' }}>
        <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
          <h3>Total Reports</h3>
          <p style={{ fontSize: '2rem', color: '#FFD700', margin: 0 }}>{totalReports}</p>
        </div>
        <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
          <h3>Pending Action</h3>
          <p style={{ fontSize: '2rem', color: '#ff4d4d', margin: 0 }}>{pendingReports}</p>
        </div>
        <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
          <h3>Potholes Fixed</h3>
          <p style={{ fontSize: '2rem', color: '#4CAF50', margin: 0 }}>{fixedReports}</p>
        </div>
      </div> */}

      <div style={{ overflowX: 'auto', backgroundColor: '#1e1e1e', borderRadius: '8px', padding: '20px', border: '1px solid #333' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #444', color: '#aaaaaa' }}>
              <th style={{ padding: '12px' }}>Date</th>
              <th style={{ padding: '12px' }}>Potholes</th>
              <th style={{ padding: '12px' }}>Location (Lat, Lng)</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report._id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '12px' }}>{new Date(report.reported_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>{report.pothole_count}</td>
                <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                  {report.latitude ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}` : 'Unknown'}
                </td>
                <td style={{ padding: '12px', fontWeight: 'bold', color: report.status === 'Fixed' ? '#4CAF50' : '#ff4d4d' }}>
                  {report.status}
                </td>
                <td style={{ padding: '12px' }}>
                  <select 
                    value={report.status} 
                    onChange={(e) => handleStatusChange(report._id, e.target.value)}
                    style={{ padding: '5px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Fixed">Fixed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;

// // AdminDashboard.js
// import React, { useEffect, useState } from 'react';

// const AdminDashboard = () => {
//   const [reports, setReports] = useState([]);

//   // Fetch all reports on load
//   const fetchReports = async () => {
//     try {
//       const response = await fetch('http://127.0.0.1:5000/api/reports');
//       const data = await response.json();
//       setReports(data);
//     } catch (error) {
//       console.error("Error fetching reports:", error);
//     }
//   };

//   useEffect(() => {
//     fetchReports();
//   }, []);

//   // Handle status changes
//   const handleStatusChange = async (reportId, newStatus) => {
//     try {
//       await fetch(`http://127.0.0.1:5000/api/reports/${reportId}/status`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ status: newStatus }),
//       });
//       // Refresh the data after updating
//       fetchReports();
//     } catch (error) {
//       console.error("Error updating status:", error);
//     }
//   };

//   // Analytics Math
//   const totalReports = reports.length;
//   const pendingReports = reports.filter(r => r.status === 'Pending').length;
//   const fixedReports = reports.filter(r => r.status === 'Fixed').length;

//   return (
//     <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
//       <h2 style={{ color: '#FFD700', borderBottom: '2px solid #333', paddingBottom: '10px' }}>
//         Authority Dashboard
//       </h2>

//       {/* Analytics Cards */}
//       <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', marginTop: '20px' }}>
//         <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
//           <h3>Total Reports</h3>
//           <p style={{ fontSize: '2rem', color: '#FFD700', margin: 0 }}>{totalReports}</p>
//         </div>
//         <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
//           <h3>Pending Action</h3>
//           <p style={{ fontSize: '2rem', color: '#ff4d4d', margin: 0 }}>{pendingReports}</p>
//         </div>
//         <div style={{ flex: 1, backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
//           <h3>Potholes Fixed</h3>
//           <p style={{ fontSize: '2rem', color: '#4CAF50', margin: 0 }}>{fixedReports}</p>
//         </div>
//       </div>

//       {/* Data Table */}
//       <div style={{ overflowX: 'auto', backgroundColor: '#1e1e1e', borderRadius: '8px', padding: '20px', border: '1px solid #333' }}>
//         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
//           <thead>
//             <tr style={{ borderBottom: '1px solid #444', color: '#aaaaaa' }}>
//               <th style={{ padding: '12px' }}>Date</th>
//               <th style={{ padding: '12px' }}>Potholes</th>
//               <th style={{ padding: '12px' }}>Location (Lat, Lng)</th>
//               <th style={{ padding: '12px' }}>Status</th>
//               <th style={{ padding: '12px' }}>Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {reports.map((report) => (
//               <tr key={report._id} style={{ borderBottom: '1px solid #333' }}>
//                 <td style={{ padding: '12px' }}>{new Date(report.reported_at).toLocaleDateString()}</td>
//                 <td style={{ padding: '12px' }}>{report.pothole_count}</td>
//                 <td style={{ padding: '12px', fontSize: '0.9rem' }}>
//                   {report.latitude ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}` : 'Unknown'}
//                 </td>
//                 <td style={{ padding: '12px', fontWeight: 'bold', color: report.status === 'Fixed' ? '#4CAF50' : '#ff4d4d' }}>
//                   {report.status}
//                 </td>
//                 <td style={{ padding: '12px' }}>
//                   <select 
//                     value={report.status} 
//                     onChange={(e) => handleStatusChange(report._id, e.target.value)}
//                     style={{ padding: '5px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
//                   >
//                     <option value="Pending">Pending</option>
//                     <option value="In Progress">In Progress</option>
//                     <option value="Fixed">Fixed</option>
//                   </select>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default AdminDashboard;