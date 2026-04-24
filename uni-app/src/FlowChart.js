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
  const [view, setView] = useState("flow");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeMap, setNodeMap] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null); // Track highlighted node
  const [guided, setGuided] = useState(false);
  const [current, setCurrent] = useState("1");
  const [text, setText] = useState("");
  const isMobile = window.innerWidth < 768;

  // Load CSV data for nodes and edges
  useEffect(() => {
    Papa.parse("/data/data.csv", {
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
    if (view === "overview") {
      fetch("/data/overview.txt").then((r) => r.text()).then(setText);
    }
    if (view === "summary") {
      fetch("/data/summary.txt").then((r) => r.text()).then(setText);
    }
  }, [view]);

  const onNodeClick = (_, node) => {
    if (guided) return;
    setSelectedNode(node.data);
    setHighlightedNodeId(node.id);  // Highlight the clicked node
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
        <button onClick={() => setView("flow")} style={customButtonStyle}>Flowchart</button>
        {/* Start or Exit Guided Mode Button nested under Flowchart button */}
        {view === "flow" && (
          <div style={{ marginTop: "10px", marginBottom: "20px" }}>
            {!guided ? (
              <button onClick={() => startGuided("1")} style={customButtonStyle}>Start Guided Mode</button>
            ) : (
              <button onClick={exitGuided} style={customButtonStyle}>Exit Guided Mode</button>
            )}
          </div>
        )}
        <button onClick={() => setView("overview")} style={customButtonStyle}>Overview</button>
        <button onClick={() => setView("summary")} style={customButtonStyle}>Summary</button>
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
              fitView
            >
              <Background />
              <Controls />

              {/* GUIDED PANEL */}
              {guided && active && (
                <div
                  style={{
                    position: "absolute",
                    top: "80px",  // Position below Flowchart button
                    left: "20px",  // Keep it left-aligned
                    background: "#fff",
                    padding: "20px",
                    borderRadius: "10px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    zIndex: 20,
                  }}
                >
                  <b>{active.label}</b>
                  <p style={{ fontSize: 12 }}>{active.desc}</p>

                  {/* Show choices only if there are multiple next options */}
                  {active.next && active.next.split(";").length > 1 && 
                    active.next.split(";").map((choice) => {
                      // Exclude Grafana node (ID 22) if current node is Defender for Cloud (ID 15)
                      if (current === "15" && choice === "22") {
                        return null; // Don't render the button for Grafana
                      }
                      // Exclude Next button for GitHub node (ID 14)
                      if (current === "14") {
                        return null; // Don't render the button for GitHub
                      }
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

                  {/* Remove Next button for specific nodes */}
                  {current !== "15" && current !== "14" && (
                    <button onClick={next} style={customButtonStyle}>Next →</button>
                  )}
                </div>
              )}
            </ReactFlow>
          </ReactFlowProvider>
        )}

        {/* Overview or Summary */}
        {(view === "overview" || view === "summary") && (
          <div style={{ padding: 20 }}>
            <h2>{view}</h2>
            <pre>{text}</pre>
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