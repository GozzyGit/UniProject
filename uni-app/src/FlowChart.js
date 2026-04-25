import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { FaTools, FaCloud } from "react-icons/fa";
import { IoMdAnalytics } from "react-icons/io";
import { MdSettingsInputComponent } from "react-icons/md";

// Constants and Styles
const STORAGE_KEY = "azure-flow-layout";
const GREEN = "#16a34a";
const RED = "#dc2626";
const GREY = "#6b7280";

const typeColors = {
  process: "#3b82f6",
  devops: "#8b5cf6",
  observability: "#f59e0b",
  default: "#6b7280",
};

const customButtonStyle = {
  backgroundColor: "#0078d4",
  color: "white",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "16px",
  cursor: "pointer",
  transition: "background-color 0.3s",
  marginBottom: "10px",
};

const descriptionStyle = {
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#333",
  marginTop: "10px",
  maxWidth: "700px",
};

const getNodeIcon = (type) => {
  const iconStyle = { fontSize: "30px", marginRight: "10px" };
  switch (type) {
    case "process":
      return <FaTools style={{ ...iconStyle, color: typeColors.process }} />;
    case "devops":
      return <MdSettingsInputComponent style={{ ...iconStyle, color: typeColors.devops }} />;
    case "observability":
      return <IoMdAnalytics style={{ ...iconStyle, color: typeColors.observability }} />;
    default:
      return <FaCloud style={{ ...iconStyle, color: typeColors.default }} />;
  }
};

const NodeLabel = ({ icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    {icon && <div style={{ marginRight: '10px' }}>{icon}</div>}
    <div>{label}</div>
  </div>
);

const getTextColor = (type) => {
  switch (type) {
    case "process":
      return "#333";
    case "devops":
      return "#050505";
    case "observability":
      return "#333";
    default:
      return "#333";
  }
};

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
    border: `4px solid ${highlightedNodeId === row.id || (guided && current === row.id) ? "#00aaff" : typeColors[row.type] || typeColors.default}`,
    fontSize: 16,
    fontWeight: "500",
    color: getTextColor(row.type),
    cursor: "pointer",
    boxShadow: highlightedNodeId === row.id || (guided && current === row.id)
      ? "0 6px 12px rgba(0, 170, 255, 0.3)"
      : "0 3px 6px rgba(0, 0, 0, 0.1)",
    opacity: !guided || highlightedNodeId === row.id || (guided && current === row.id) ? 1 : 0.4,
    transition: "all 0.3s ease",
  },
  draggable: true,
});

export default function FlowChart() {
  const [view, setView] = useState("flow");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeMap, setNodeMap] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [guided, setGuided] = useState(false);
  const [current, setCurrent] = useState("1");
  const [text, setText] = useState("");

  const popupRef = useRef(null);

  const baseUrl = process.env.PUBLIC_URL || '/UniProject';

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
  }, [baseUrl, highlightedNodeId, guided, current, setNodes, setEdges]);

  // Load text data (overview/summary)
  useEffect(() => {
    const filePath = view === "overview" ? `${baseUrl}/data/overview.txt` : `${baseUrl}/data/summary.txt`;

    fetch(filePath)
      .then((response) => response.text())
      .then(setText)
      .catch((error) => {
        console.error("Error fetching text file:", error);
      });
  }, [view, baseUrl]);

  // Node drag and drop handling
  const onNodeDragStop = (event, node) => {
    const updatedNodes = nodes.map((n) => {
      if (n.id === node.id) {
        n.position = { x: node.position.x, y: node.position.y };
      }
      return n;
    });

    setNodes(updatedNodes);

    // Save the updated position to localStorage
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    saved[node.id] = node.position;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  };

  // const onNodeClick = (_, node) => {
  //   if (guided) return;
  //   setSelectedNode(node.data);
  //   setHighlightedNodeId(node.id);
  // };

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

  // Detect clicks outside of the popup to exit guided mode
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        exitGuided();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div style={{
        width: 250,
        padding: "20px 15px",
        backgroundColor: "#1e3a8a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        height: "100vh",
        boxShadow: "2px 0px 10px rgba(0, 0, 0, 0.1)",
        position: "fixed",
      }}>
        <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Azure Flow</h2>
        <button onClick={() => setView("overview")} style={customButtonStyle}>
          Overview
        </button>
        <button onClick={() => setView("flow")} style={customButtonStyle}>
          Flowchart
        </button>

        {view === "flow" && !guided && (
          <button onClick={() => startGuided()} style={customButtonStyle}>
            Start Guided Mode
          </button>
        )}

        <button onClick={() => setView("summary")} style={customButtonStyle}>
          Summary
        </button>

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
              // onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop} // Capture the drag stop
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        )}

        {guided && active && (
          <div
            ref={popupRef}
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
            {active.next && active.next.split(";").length > 1 &&
              active.next.split(";").map((choice) => {
                if (current === "15" && choice === "22") return null;
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
            {active.id !== "5" && active.id !== "6" && active.id !== "7" && active.id !== "15" && (
              <button onClick={next} style={customButtonStyle}>
                Next →
              </button>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <button onClick={exitGuided} style={customButtonStyle}>
                Exit Guided Mode
              </button>
            </div>
          </div>
        )}

        {(view === "overview" || view === "summary") && (
          <div style={{
            padding: "40px",
            backgroundColor: "#f9fafb",
            borderRadius: "12px",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.1)",
            maxWidth: "1000px",
            margin: "0 auto",
            marginTop: "30px",
            color: "#333",
            fontFamily: "'Roboto', sans-serif",
            lineHeight: "1.7",
          }}>
            <h2 style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e3a8a",
              marginBottom: "20px",
            }}>
              {view === "overview" ? "Overview" : "Summary"}
            </h2>
            <p style={{
              fontSize: "16px",
              fontWeight: "400",
              color: "#4b5563",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}>
              {text}
            </p>
          </div>
        )}

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