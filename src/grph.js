
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  RadarController,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Pie, Bar, Radar, Scatter, Bubble } from "react-chartjs-2"; // Import Scatter and Bubble

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  RadarController,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

const socket = io("http://localhost:5002");

const RealtimeGraphs = () => {
  const [detectionData, setDetectionData] = useState([]);
  const [classCounts, setClassCounts] = useState({});
  const [timestamps, setTimestamps] = useState([]);

  useEffect(() => {
    socket.on("detection_update", (data) => {
      setDetectionData((prev) => [...prev, data]);
      setClassCounts(data.class_counts);
      setTimestamps((prev) => [...prev, data.timestamp]);
    });

    return () => {
      socket.off("detection_update");
    };
  }, []);

  const aggregateClassCounts = () => {
    const aggregated = {};
    detectionData.forEach((data) => {
      Object.entries(data.class_counts).forEach(([key, value]) => {
        aggregated[key] = (aggregated[key] || 0) + value;
      });
    });
    return aggregated;
  };

  const aggregatedCounts = aggregateClassCounts();

  const greenPalette = [
    "rgba(144, 238, 144, 0.8)", // Light green
    "rgba(60, 179, 113, 0.8)",  // Medium sea green
    "rgba(46, 139, 87, 0.8)",   // Sea green
    "rgba(34, 139, 34, 0.8)",   // Forest green
    "rgba(0, 128, 0, 0.8)",     // Green
  ];

  const lineData = {
    labels: timestamps,
    datasets: [
      {
        label: "Total Vehicles Detected",
        data: detectionData.map((d) => d.vehicles_detected),
        borderColor: "rgba(34, 139, 34, 1)", // Forest green
        backgroundColor: "rgba(144, 238, 144, 0.3)", // Light green with transparency
        fill: true,
      },
    ],
  };

  const pieData = {
    labels: Object.keys(aggregatedCounts),
    datasets: [
      {
        data: Object.values(aggregatedCounts),
        backgroundColor: greenPalette,
      },
    ],
  };

  const barData = {
    labels: Object.keys(aggregatedCounts),
    datasets: [
      {
        label: "Vehicle Classes",
        data: Object.values(aggregatedCounts),
        backgroundColor: greenPalette,
      },
    ],
  };

  const radarData = {
    labels: Object.keys(aggregatedCounts),
    datasets: [
      {
        label: "Class Count Trends",
        data: Object.values(aggregatedCounts),
        backgroundColor: "rgba(144, 238, 144, 0.4)", // Light green with transparency
        borderColor: "rgba(34, 139, 34, 1)", // Forest green
      },
    ],
  };

  const doughnutData = {
    labels: Object.keys(aggregatedCounts),
    datasets: [
      {
        data: Object.values(aggregatedCounts),
        backgroundColor: greenPalette,
        borderWidth: 0,
      },
    ],
  };

  const scatterData = {
    datasets: [
      {
        label: "Vehicle Counts over Time",
        data: detectionData.map((d, idx) => ({
          x: idx,
          y: d.vehicles_detected,
        })),
        backgroundColor: "rgba(34, 139, 34, 1)",
      },
    ],
  };

  const bubbleData = {
    datasets: [
      {
        label: "Class Distribution over Time",
        data: detectionData.map((d, idx) => ({
          x: idx,
          y: d.vehicles_detected,
          r: d.vehicles_detected / 10, // Radius proportional to detected vehicles
        })),
        backgroundColor: "rgba(60, 179, 113, 0.8)",
      },
    ],
  };

  return (
    <div style={{ fontFamily: "'Arial', sans-serif", margin: "20px", padding: "20px", backgroundColor: "#f5f5f5" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px", color: "#2c3e50" }}>
        Real-Time Vehicle Detection Dashboard
      </h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "space-between",
          marginTop: "20px",
        }}
      >
        {/* Line Chart */}
        <div
          style={{
            width: "45%",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#2c3e50" }}>Total Vehicles Detected (Line Chart)</h3>
          <Line data={lineData} />
        </div>

        {/* Doughnut Chart (Replaces Pie Chart) */}
        <div
          style={{
            width: "45%",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#2c3e50" }}>Vehicle Class Distribution (Doughnut Chart)</h3>
          <Pie data={doughnutData} />
        </div>

        {/* Bar Chart */}
        <div
          style={{
            width: "45%",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#2c3e50" }}>Top 5 Vehicle Classes (Bar Chart)</h3>
          <Bar data={barData} />
        </div>

        {/* Radar Chart */}
        <div
          style={{
            width: "45%",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#2c3e50" }}>Class Count Trends (Radar Chart)</h3>
          <Radar data={radarData} />
        </div>

        {/* Scatter Plot */}
        <div
          style={{
            width: "45%",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#2c3e50" }}>Vehicle Counts over Time (Scatter Plot)</h3>
          <Scatter data={scatterData} />
        </div>

        {/* Bubble Chart */}
        <div
          style={{
            width: "45%",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ textAlign: "center", color: "#2c3e50" }}>Class Distribution over Time (Bubble Chart)</h3>
          <Bubble data={bubbleData} />
        </div>
      </div>
    </div>
  );
};

export default RealtimeGraphs;

// import React, { useState, useEffect } from "react";
// import { io } from "socket.io-client";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   ArcElement,
//   BarElement,
//   PointElement,
//   LineElement,
//   RadarController,
//   RadialLinearScale,
//   Title,
//   Tooltip,
//   Legend,
// } from "chart.js";
// import { Line, Pie, Bar, Radar, Scatter, Bubble, Doughnut } from "react-chartjs-2";

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   ArcElement,
//   BarElement,
//   PointElement,
//   LineElement,
//   RadarController,
//   RadialLinearScale,
//   Title,
//   Tooltip,
//   Legend
// );

// const socket = io("http://localhost:5002");

// const RealtimeGraphs = () => {
//   const [detectionData, setDetectionData] = useState([]);
//   const [classCounts, setClassCounts] = useState({});
//   const [timestamps, setTimestamps] = useState([]);

//   useEffect(() => {
//     socket.on("detection_update", (data) => {
//       setDetectionData((prev) => [...prev, data]);
//       setClassCounts(data.class_counts);
//       setTimestamps((prev) => [...prev, data.timestamp]);
//     });

//     return () => {
//       socket.off("detection_update");
//     };
//   }, []);

//   const aggregateClassCounts = () => {
//     const aggregated = {};
//     detectionData.forEach((data) => {
//       Object.entries(data.class_counts).forEach(([key, value]) => {
//         aggregated[key] = (aggregated[key] || 0) + value;
//       });
//     });
//     return aggregated;
//   };

//   const aggregatedCounts = aggregateClassCounts();

//   const theme = {
//     background: "#1c1c1c",
//     cardBackground: "#2e2e2e",
//     highlight: "rgba(173, 255, 47, 1)", // Fluorescent yellow-green
//     lightText: "#f5f5f5",
//   };

//   const greenPalette = [
//     "rgba(144, 238, 144, 0.8)", // Light green
//     "rgba(60, 179, 113, 0.8)",  // Medium sea green
//     "rgba(46, 139, 87, 0.8)",   // Sea green
//     "rgba(34, 139, 34, 0.8)",   // Forest green
//     "rgba(0, 128, 0, 0.8)",     // Green
//   ];

//   // Chart Data Configurations
//   const lineData = {
//     labels: timestamps,
//     datasets: [
//       {
//         label: "Total Vehicles Detected",
//         data: detectionData.map((d) => d.vehicles_detected),
//         borderColor: theme.highlight,
//         backgroundColor: "rgba(144, 238, 144, 0.3)", // Light green with transparency
//         fill: true,
//       },
//     ],
//   };

//   const doughnutData = {
//     labels: Object.keys(aggregatedCounts),
//     datasets: [
//       {
//         data: Object.values(aggregatedCounts),
//         backgroundColor: greenPalette,
//         borderWidth: 0,
//       },
//     ],
//   };

//   const barData = {
//     labels: Object.keys(aggregatedCounts),
//     datasets: [
//       {
//         label: "Vehicle Classes",
//         data: Object.values(aggregatedCounts),
//         backgroundColor: greenPalette,
//       },
//     ],
//   };

//   const radarData = {
//     labels: Object.keys(aggregatedCounts),
//     datasets: [
//       {
//         label: "Class Count Trends",
//         data: Object.values(aggregatedCounts),
//         backgroundColor: "rgba(144, 238, 144, 0.4)", // Light green with transparency
//         borderColor: theme.highlight,
//       },
//     ],
//   };

//   const scatterData = {
//     datasets: [
//       {
//         label: "Vehicle Counts over Time",
//         data: detectionData.map((d, idx) => ({
//           x: idx,
//           y: d.vehicles_detected,
//         })),
//         backgroundColor: theme.highlight,
//       },
//     ],
//   };

//   const bubbleData = {
//     datasets: [
//       {
//         label: "Class Distribution over Time",
//         data: detectionData.map((d, idx) => ({
//           x: idx,
//           y: d.vehicles_detected,
//           r: d.vehicles_detected / 10, // Radius proportional to detected vehicles
//         })),
//         backgroundColor: "rgba(60, 179, 113, 0.8)",
//       },
//     ],
//   };

//   return (
//     <div style={{ fontFamily: "'Arial', sans-serif", margin: "20px", padding: "20px", backgroundColor: theme.background, color: theme.lightText }}>
//       <h1 style={{ textAlign: "center", marginBottom: "30px", color: theme.highlight }}>
//         Traffic Flow Analysis
//       </h1>

//       <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "space-between", marginTop: "20px" }}>
//         {/* Line Chart */}
//         <div style={{ width: "45%", backgroundColor: theme.cardBackground, borderRadius: "12px", padding: "20px", boxShadow: "0 4px 10px rgba(0, 255, 100, 0.2)" }}>
//           <h3 style={{ textAlign: "center", color: theme.highlight }}>Total Vehicles Detected (Line Chart)</h3>
//           <Line data={lineData} />
//         </div>

//         {/* Doughnut Chart */}
//         <div style={{ width: "45%", backgroundColor: theme.cardBackground, borderRadius: "12px", padding: "20px", boxShadow: "0 4px 10px rgba(0, 255, 100, 0.2)" }}>
//           <h3 style={{ textAlign: "center", color: theme.highlight }}>Vehicle Class Distribution (Doughnut Chart)</h3>
//           <Doughnut data={doughnutData} />
//         </div>

//         {/* Bar Chart */}
//         <div style={{ width: "45%", backgroundColor: theme.cardBackground, borderRadius: "12px", padding: "20px", boxShadow: "0 4px 10px rgba(0, 255, 100, 0.2)" }}>
//           <h3 style={{ textAlign: "center", color: theme.highlight }}>Top Vehicle Classes (Bar Chart)</h3>
//           <Bar data={barData} />
//         </div>

//         {/* Radar Chart */}
//         <div style={{ width: "45%", backgroundColor: theme.cardBackground, borderRadius: "12px", padding: "20px", boxShadow: "0 4px 10px rgba(0, 255, 100, 0.2)" }}>
//           <h3 style={{ textAlign: "center", color: theme.highlight }}>Class Count Trends (Radar Chart)</h3>
//           <Radar data={radarData} />
//         </div>

//         {/* Scatter Plot */}
//         <div style={{ width: "45%", backgroundColor: theme.cardBackground, borderRadius: "12px", padding: "20px", boxShadow: "0 4px 10px rgba(0, 255, 100, 0.2)" }}>
//           <h3 style={{ textAlign: "center", color: theme.highlight }}>Vehicle Counts over Time (Scatter Plot)</h3>
//           <Scatter data={scatterData} />
//         </div>

//         {/* Bubble Chart */}
//         <div style={{ width: "45%", backgroundColor: theme.cardBackground, borderRadius: "12px", padding: "20px", boxShadow: "0 4px 10px rgba(0, 255, 100, 0.2)" }}>
//           <h3 style={{ textAlign: "center", color: theme.highlight }}>Class Distribution over Time (Bubble Chart)</h3>
//           <Bubble data={bubbleData} />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default RealtimeGraphs;
