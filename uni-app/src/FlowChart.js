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
import "reactflow/dist/style.css";

const STORAGE_KEY = "azure-flow-layout";

/* ---------------- COLORS ---------------- */
const typeColors = {
  process: "#3b82f6",
  devops: "#8b5cf6",
  observability: "#f59e0b",
  default: "#6b7280",
};

const GREEN = "#16a34a";
const RED = "#dc2626";
const GREY = "#6b7280";

/* ---------------- NODE ---------------- */
const makeNode = (row, saved) => ({
  id: String(row.id),
  position: saved[row.id] || {
    x: Math.random() * 600,
    y: Math.random() * 400,
  },
  data: {
    label: row.label,
    desc: row.desc,
    type: row.type,
    next: row.next,
  },
  style: {
    width: 200,
    padding: 10,
    borderRadius: 6,
    background: "#fff",
    border: `2px solid ${typeColors[row.type] || typeColors.default}`,
    fontSize: 12,
    cursor: "pointer",
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

  const [text, setText] = useState("");

  const isMobile = window.innerWidth < 768;

  /* ---------------- LOAD DATA ---------------- */
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
          tempNodes.push(makeNode(row, saved));

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
  }, []);

  /* ---------------- OVERVIEW / SUMMARY ---------------- */
  useEffect(() => {
    if (view === "overview") {
      fetch("/data/overview.txt").then(r => r.text()).then(setText);
    }
    if (view === "summary") {
      fetch("/data/summary.txt").then(r => r.text()).then(setText);
    }
  }, [view]);

  /* ---------------- CLICK ---------------- */
  const onNodeClick = (_, node) => {
    if (guided) return;
    setSelectedNode(node.data);
  };

  /* ---------------- GUIDED ---------------- */
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

  /* ---------------- UI ---------------- */
  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* SIDEBAR */}
      <div style={{
        width: 220,
        padding: 12,
        borderRight: "1px solid #e5e7eb",
        background: "#fafafa"
      }}>
        <h3>Navigation</h3>

        <button onClick={() => setView("flow")}>Flowchart</button>
        <br /><br />
        <button onClick={() => setView("overview")}>Overview</button>
        <br /><br />
        <button onClick={() => setView("summary")}>Summary</button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, position: "relative" }}>

        {view === "flow" && (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes.map(n => ({
                ...n,
                style: {
                  ...n.style,
                  opacity: guided ? (current === n.id ? 1 : 0.25) : 1,
                  border:
                    guided && current === n.id
                      ? "2px solid #2563eb"
                      : n.style.border,
                },
              }))}
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
                  <button onClick={() => startGuided("1")}>
                    Start Guided Mode
                  </button>
                ) : (
                  <button onClick={exitGuided}>
                    Exit Guided Mode
                  </button>
                )}
              </div>

              {/* GUIDED PANEL (MOVED UP 20%) */}
              {guided && active && (
                <div
                  style={{
                    position: "absolute",
                    bottom: isMobile ? "15%" : "20%",
                    left: isMobile ? 10 : 20,
                    right: isMobile ? 10 : "auto",
                    width: isMobile ? "calc(100% - 20px)" : 280,

                    background: "#fff",
                    padding: 12,
                    borderRadius: 10,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    zIndex: 20,
                  }}
                >
                  <b>{active.label}</b>
                  <p style={{ fontSize: 12 }}>{active.desc}</p>

                  {current === "5" && (
                    <>
                      <button onClick={() => choose("6")}>Bicep Build</button>
                      <button onClick={() => choose("7")}>Ansible Build</button>
                    </>
                  )}

                  {["6", "7"].includes(current) && (
                    <>
                      <button onClick={() => choose("8")}>Azure Cloud</button>
                      <button onClick={() => choose("9")}>Azure Arc</button>
                    </>
                  )}

                  {current === "15" && (
                    <>
                      <button onClick={() => choose("16")}>Success</button>
                      <button onClick={() => choose("17")}>Failure</button>
                    </>
                  )}

                  {!["5", "6", "7", "15"].includes(current) && (
                    <button onClick={next}>Next →</button>
                  )}
                </div>
              )}
            </ReactFlow>
          </ReactFlowProvider>
        )}

        {/* OVERVIEW / SUMMARY */}
        {(view === "overview" || view === "summary") && (
          <div style={{ padding: 20 }}>
            <h2>{view}</h2>
            <pre>{text}</pre>
          </div>
        )}

        {/* NODE DETAILS */}
        {selectedNode && !guided && (
          <div style={{
            position: "absolute",
            right: 20,
            top: 60,
            width: 320,
            background: "#fff",
            padding: 16,
            borderRadius: 10,
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          }}>
            <h3>{selectedNode.label}</h3>
            <p>{selectedNode.desc}</p>
            <button onClick={() => setSelectedNode(null)}>Close</button>
          </div>
        )}

      </div>
    </div>
  );
}