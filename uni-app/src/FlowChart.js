import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { FaTools, FaCloud } from "react-icons/fa"; // Example colorful icons
import { IoMdAnalytics } from "react-icons/io";
import { MdSettingsInputComponent } from "react-icons/md"; // For DevOps type

// Constants and Styles
const STORAGE_KEY = "azure-flow-layout";
const GREEN = "#16a34a";
const RED = "#dc2626";
const GREY = "#6b7280";

// Colors for node types
const typeColors = {
  process: "#3b82f6", // Azure blue for process
  devops: "#8b5cf6",  // Purple for DevOps
  observability: "#f59e0b", // Yellow for Observability
  default: "#6b7280",  // Grey for default
};

// Styling for the custom button
const customButtonStyle = {
  backgroundColor: "#0078d4", // Azure Blue
  color: "white",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "16px",
  cursor: "pointer",
  transition: "background-color 0.3s",
  marginBottom: "10px",
};

// Node Description Styling
const descriptionStyle = {
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",  // Professional font
  fontSize: "14px",  // Slightly smaller text size for better readability
  lineHeight: "1.6",  // Increase line height for better readability
  color: "#333",  // Dark color for better contrast
  marginTop: "10px",  // Add space between label and description
  maxWidth: "700px",  // Limit the width for a better text block
};

// Map each node type to an icon
const getNodeIcon = (type) => {
  const iconStyle = { fontSize: "24px", marginRight: "10px" };  // Adjust the font size here
  switch (type) {
    case "process":
      return <FaTools style={{ ...iconStyle, color: "#3b82f6" }} />;
    case "devops":
      return <MdSettingsInputComponent style={{ ...iconStyle, color: "#8b5cf6" }} />;
    case "observability":
      return <IoMdAnalytics style={{ ...iconStyle, color: "#f59e0b" }} />;
    default:
      return <FaCloud style={{ ...iconStyle, color: "#6b7280" }} />;
  }
};

const NodeLabel = ({ icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {icon && <div style={{ marginRight: '10px' }}>{icon}</div>}
    <div>{label}</div>
  </div>
);

// Create node from CSV data
const makeNode = (row, saved, highlightedNodeId, guided, current) => ({
  id: String(row.id),
  position: saved[row.id] || { x: Math.random() * 600, y: Math.random() * 400 },
  data: {
    label: <NodeLabel icon={getNodeIcon(row.type)} label={row.label} />,
    desc: row.desc,
    type: row.type,
    next: row.next,
  },
  style: {
    width: 250,
    padding: 20,
    borderRadius: 12,
    background: "#fff",
    border: `2px solid ${highlightedNodeId === row.id || (guided && current === row.id) ? "#00aaff" : typeColors[row.type] || typeColors.default}`,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    cursor: "pointer",
    boxShadow: highlightedNodeId === row.id || (guided && current === row.id)
      ? "0 6px 12px rgba(0, 170, 255, 0.3)" // Highlighted nodes
      : "0 3px 6px rgba(0, 0, 0, 0.1)", // Normal nodes
    opacity: !guided || highlightedNodeId === row.id || (guided && current === row.id) ? 1 : 0.4, // Reduce opacity of non-guided nodes
    transition: "all 0.3s ease",  // Smooth transition for hover/active state
  },
  draggable: true,  // Allow dragging for better flow manipulation
});

export default function FlowChart() {
  const [view, setView] = useState("flow");  // Initialize the view state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeMap, setNodeMap] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null); // Track highlighted node
  const [guided, setGuided] = useState(false);
  const [current, setCurrent] = useState("1");
  const [text, setText] = useState("");

  // Base URL for assets (adjust for deployment environment)
  const baseUrl = process.env.PUBLIC_URL || '/UniProject'; // Use '/UniProject' for GitHub Pages

  // Load CSV data for nodes and edges
  useEffect(() => {
    Papa.parse(`${baseUrl}/data/data.csv`, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const tempNodes = [];
        const tempEdges = [];
        const map = {};

        res.data.forEach((row) => {
          if (!row.id) return;

          map[row.id] = row;
          tempNodes.push(makeNode(row, saved, highlightedNodeId, guided, current));

          if (row.next) {
            row.next.split(";").forEach((t) => {
              if (!t) return;

              const isFail = ["17", "20", "3"].includes(t);
              const isSuccess = ["16", "21", "1"].includes(t);

              tempEdges.push({
                id: `e${row.id}-${t}`,
                source: String(row.id),
                target: String(t),
                type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed },
                style: {
                  stroke: isFail ? RED : isSuccess ? GREEN : GREY,
                  strokeWidth: 2,
                },
              });
            });
          }
        });

        setNodeMap(map);
        setNodes(tempNodes);
        setEdges(tempEdges);
      },
    });
  }, [setNodes, setEdges, highlightedNodeId, guided, current]);

  // Load text data (overview/summary)
  useEffect(() => {
    const filePath = view === "overview" ? `${baseUrl}/data/overview.txt` : `${baseUrl}/data/summary.txt`;

    fetch(filePath)
      .then((response) => response.text())
      .then(setText)
      .catch((error) => {
        console.error("Error fetching text file:", error);
      });
  }, [view]);

  const onNodeClick = (_, node) => {
    if (guided) return;
    setSelectedNode(node.data);
    setHighlightedNodeId(node.id);  // Highlight the clicked node
  };

  // Save node positions in local storage when they are changed
  const onNodeDragStop = (event, node) => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    saved[node.id] = node.position;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  };

  // Start and Exit Guided Mode
  const startGuided = (id = "1") => {
    setGuided(true);
    setCurrent(id);
    setSelectedNode(null);
  };

  const exitGuided = () => {
    setGuided(false);
    setCurrent("1");
  };

  const next = () => {
    const node = nodeMap[current];
    if (!node?.next) return;
    setCurrent(node.next.split(";")[0]);
  };

  const choose = (id) => setCurrent(id);

  const active = nodeMap[current];

  // Render Flowchart
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 250,
          padding: "20px 15px",
          backgroundColor: "#1e3a8a", // Azure blue background
          color: "#fff", // White text
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          height: "100vh",
          boxShadow: "2px 0px 10px rgba(0, 0, 0, 0.1)", // Subtle shadow for depth
          position: "fixed",
        }}
      >
        <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Azure Flow</h2>

        {/* Flowchart Buttons */}
        <button onClick={() => setView("flow")} style={customButtonStyle}>
          Flowchart
        </button>
        <button onClick={() => setView("overview")} style={customButtonStyle}>
          Overview
        </button>
        <button onClick={() => setView("summary")} style={customButtonStyle}>
          Summary
        </button>

        {/* Guided Mode Button */}
        {!guided && (
          <button onClick={() => startGuided()} style={customButtonStyle}>
            Start Guided Mode
          </button>
        )}

        {/* Exit Guided Mode Button */}
        {guided && (
          <button onClick={exitGuided} style={customButtonStyle}>
            Exit Guided Mode
          </button>
        )}
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 250, flex: 1, padding: "20px" }}>
        {view === "flow" && (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop} // Handle drag stop to save node positions
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        )}

        {/* Guided Flowchart Panel */}
        {guided && active && (
          <div
            style={{
              position: "absolute",
              bottom: "20%",
              left: "20px",
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              zIndex: 20,
            }}
          >
            <b>{active.label}</b>
            <p style={descriptionStyle}>{active.desc}</p>

            {/* Show choices only if there are multiple next options */}
            {active.next && active.next.split(";").length > 1 &&
              active.next.split(";").map((choice) => {
                if (current === "15" && choice === "22") return null; // Exclude Grafana
                return (
                  <button
                    key={choice}
                    onClick={() => choose(choice)}
                    style={customButtonStyle}
                  >
                    Go to {nodeMap[choice]?.label || choice}
                  </button>
                );
              })}

            {/* Remove "Next" Button from Defender for Cloud Node */}
            {active.label.toLowerCase() !== "defender for cloud" && !["github", "bicep build", "ansible build"].includes(active.label.toLowerCase()) && (
              <button onClick={next} style={customButtonStyle}>Next →</button>
            )}

            {/* Exit Guided Mode Button */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <button onClick={exitGuided} style={customButtonStyle}>
                Exit Guided Mode
              </button>
            </div>
          </div>
        )}

        {/* Overview or Summary */}
        {(view === "overview" || view === "summary") && (
          <div style={{
            padding: "30px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            maxWidth: "1200px",
            margin: "0 auto",
            marginTop: "20px",
            color: "#333",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          }}>
            <h2 style={{
              fontSize: "30px", fontWeight: "600", color: "#1e3a8a", marginBottom: "20px",
            }}>
              {view === "overview" ? "Overview" : "Summary"}
            </h2>
            <pre style={{
              whiteSpace: "pre-wrap", wordWrap: "break-word", fontSize: "16px", lineHeight: "1.6",
            }}>
              {text}
            </pre>
          </div>
        )}

        {/* Node Details */}
        {selectedNode && !guided && (
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 60,
              width: 320,
              background: "#fff",
              padding: 16,
              borderRadius: 10,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <h3>{selectedNode.label}</h3>
            <p>{selectedNode.desc}</p>
            <button onClick={() => setSelectedNode(null)} style={customButtonStyle}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}