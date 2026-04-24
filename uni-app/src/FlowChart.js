import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css"; // ReactFlow's default styles

// Styling for node types
const typeColors = {
  process: "#3b82f6",  // Blue
  devops: "#8b5cf6",   // Purple
  observability: "#f59e0b",  // Yellow
  default: "#6b7280",  // Gray
};

const GREEN = "#16a34a";
const RED = "#dc2626";
const GREY = "#6b7280";

const STORAGE_KEY = "azure-flow-layout";

// Custom styles for buttons and node highlighting
const customButtonStyle = {
  backgroundColor: "#0078d4", // Azure blue
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "14px",
  transition: "background-color 0.3s",
};

// Create node from CSV data
const makeNode = (row, saved, highlightedNodeId, guided) => ({
  id: String(row.id),
  position: saved[row.id] || { x: Math.random() * 600, y: Math.random() * 400 },
  data: {
    label: row.label,
    desc: row.desc,
    type: row.type,
    next: row.next,
  },
  style: {
    width: 220,
    padding: 15,
    borderRadius: 12,
    background: "#fff",
    border: `2px solid ${highlightedNodeId === row.id ? "#ff9900" : typeColors[row.type] || typeColors.default}`,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
    opacity: !guided || highlightedNodeId === row.id ? 1 : 0.3, // All nodes visible when not in guided mode
    transition: "all 0.3s ease",
  },
});

export default function FlowChart() {
  const [view, setView] = useState("flow");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeMap, setNodeMap] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [guided, setGuided] = useState(false);
  const [current, setCurrent] = useState("1");
  const [highlightedNodeId, setHighlightedNodeId] = useState(null); // Track highlighted node
  const [text, setText] = useState(""); // Declare text state to store overview/summary data

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
          tempNodes.push(makeNode(row, saved, highlightedNodeId, guided)); // Pass guided mode and highlighted node ID
          
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
  }, [setNodes, setEdges, highlightedNodeId, guided]);

  // Load text data for overview and summary views
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
  };

  // Start and Exit Guided Mode
  const startGuided = (id = "1") => {
    setGuided(true);
    setCurrent(id);
    setSelectedNode(null);
    setHighlightedNodeId(id); // Highlight the first node
  };

  const exitGuided = () => {
    setGuided(false);
    setCurrent("1");
    setHighlightedNodeId(null); // Reset highlighted node
  };

  const next = () => {
    const node = nodeMap[current];
    if (!node?.next) return;
    const nextId = node.next.split(";")[0];
    setCurrent(nextId);
    setHighlightedNodeId(nextId); // Highlight the next node
  };

  const choose = (id) => {
    setCurrent(id);
    setHighlightedNodeId(id); // Highlight the selected node
  };

  const active = nodeMap[current];

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: 220,
          padding: 20,
          borderRight: "1px solid #e5e7eb",
          background: "#fafafa",
        }}
      >
        <h3>Navigation</h3>
        <button onClick={() => setView("flow")} style={customButtonStyle}>Flowchart</button>
        <br />
        <button onClick={() => setView("overview")} style={customButtonStyle}>Overview</button>
        <br />
        <button onClick={() => setView("summary")} style={customButtonStyle}>Summary</button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, position: "relative" }}>
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

              {/* GUIDED BUTTON */}
              <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}>
                {!guided ? (
                  <button onClick={() => startGuided("1")} style={customButtonStyle}>Start Guided Mode</button>
                ) : (
                  <button onClick={exitGuided} style={customButtonStyle}>Exit Guided Mode</button>
                )}
              </div>

              {/* GUIDED PANEL */}
              {guided && active && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "20%",
                    left: "20px",
                    width: "280px",
                    background: "#fff",
                    padding: "12px",
                    borderRadius: "10px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    zIndex: 20,
                  }}
                >
                  <b>{active.label}</b>
                  <p style={{ fontSize: 12 }}>{active.desc}</p>

                  {current === "5" && (
                    <>
                      <button onClick={() => choose("6")} style={customButtonStyle}>Bicep Build</button>
                      <button onClick={() => choose("7")} style={customButtonStyle}>Ansible Build</button>
                    </>
                  )}

                  {["6", "7"].includes(current) && (
                    <>
                      <button onClick={() => choose("8")} style={customButtonStyle}>Azure Cloud</button>
                      <button onClick={() => choose("9")} style={customButtonStyle}>Azure Arc</button>
                    </>
                  )}

                  {current === "15" && (
                    <>
                      <button onClick={() => choose("16")} style={customButtonStyle}>Success</button>
                      <button onClick={() => choose("17")} style={customButtonStyle}>Failure</button>
                    </>
                  )}

                  {!["5", "6", "7", "15"].includes(current) && (
                    <button onClick={next} style={customButtonStyle}>Next →</button>
                  )}
                </div>
              )}
            </ReactFlow>
          </ReactFlowProvider>
        )}

        {/* Overview or Summary */}
        {(view === "overview" || view === "summary") && (
          <div
            style={{
              padding: "20px 40px",
              backgroundColor: "#f5f7f9",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                maxWidth: "900px",
                width: "100%",
                backgroundColor: "#fff",
                padding: "30px",
                borderRadius: "10px",
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <h2 style={{ fontSize: "28px", marginBottom: "20px", color: "#333" }}>
                {view === "overview" ? "Overview" : "Summary"}
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  color: "#555",
                  whiteSpace: "pre-wrap", // Preserve text formatting
                }}
              >
                {text}
              </p>
            </div>
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