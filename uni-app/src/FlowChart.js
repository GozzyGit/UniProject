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
  const [current, setCurrent] = useState(null);

  /* ---------------- LOAD ---------------- */
  useEffect(() => {
    if (view !== "flow") return;

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

              tempEdges.push({
                id: `e${row.id}-${t}`,
                source: String(row.id),
                target: String(t),
                type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: "#6b7280" },
              });
            });
          }
        });

        setNodeMap(map);
        setNodes(tempNodes);
        setEdges(tempEdges);
      },
    });
  }, [view]);

  /* ---------------- SAVE POSITION ---------------- */
  const onNodeDragStop = (_, node) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === node.id ? { ...n, position: node.position } : n
      );

      const positions = {};
      updated.forEach((n) => (positions[n.id] = n.position));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
      return updated;
    });
  };

  /* ---------------- CLICK NODE ---------------- */
  const onNodeClick = (_, node) => {
    if (guided) return;
    setSelectedNode(node.data);
  };

  /* ---------------- GUIDED ---------------- */
  const startGuided = (startId = "1") => {
    setGuided(true);
    setCurrent(startId);
    setSelectedNode(null);
  };

  const exitGuided = () => {
    setGuided(false);
    setCurrent(null);
  };

  const next = () => {
    const node = nodeMap[current];
    if (!node?.next) return;
    setCurrent(node.next.split(";")[0]);
  };

  const choose = (id) => setCurrent(id);

  const activeNode = current ? nodeMap[current] : null;

  const goToNode = (id) => {
    setSelectedNode(nodeMap[id]);
  };

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
              nodes={nodes.map((n) => ({
                ...n,
                style: {
                  ...n.style,
                  opacity: guided ? (current === n.id ? 1 : 0.3) : 1,
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
              onNodeDragStop={onNodeDragStop}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            >
              <Background />
              <Controls />

              {/* GUIDED CONTROLS */}
              <div style={{
                position: "absolute",
                top: 10,
                left: 10,
                zIndex: 10,
                display: "flex",
                gap: 8,
              }}>
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

              {/* GUIDED PANEL */}
              {guided && activeNode && (
                <div style={{
                  position: "absolute",
                  top: 50,
                  left: 10,
                  background: "#fff",
                  padding: 10,
                  borderRadius: 8,
                  width: 260,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  zIndex: 10,
                }}>
                  <div><b>{activeNode.label}</b></div>
                  <div style={{ fontSize: 12, marginBottom: 8 }}>
                    {activeNode.desc}
                  </div>

                  {current === "5" && (
                    <>
                      <button onClick={() => choose("6")}>Bicep Build</button>
                      <button onClick={() => choose("7")}>Ansible Build</button>
                    </>
                  )}

                  {current === "6" && (
                    <>
                      <button onClick={() => choose("8")}>Azure Cloud</button>
                      <button onClick={() => choose("9")}>Azure Arc</button>
                    </>
                  )}

                  {current === "7" && (
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

        {/* MANUAL MODE (NOW WITH CONTROLS) */}
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

            <hr />

            <button onClick={() => startGuided(nodeMap[current]?.id || "1")}>
              ▶ Start Guided From Here
            </button>

            {selectedNode.next && (
              <button
                style={{ display: "block", marginTop: 8 }}
                onClick={() => {
                  const nextId = selectedNode.next.split(";")[0];
                  goToNode(nextId);
                }}
              >
                Continue →
              </button>
            )}

            {/* BRANCHING (MANUAL MODE) */}
            {selectedNode.label?.toLowerCase().includes("bicep") && (
              <>
                <button onClick={() => goToNode("8")}>Azure Cloud</button>
                <button onClick={() => goToNode("9")}>Azure Arc</button>
              </>
            )}

            {selectedNode.label?.toLowerCase().includes("ansible") && (
              <>
                <button onClick={() => goToNode("8")}>Azure Cloud</button>
                <button onClick={() => goToNode("9")}>Azure Arc</button>
              </>
            )}

            {selectedNode.label?.toLowerCase().includes("success") && (
              <button onClick={() => goToNode("21")}>
                Mark Completed
              </button>
            )}

            <button onClick={() => setSelectedNode(null)} style={{ marginTop: 10 }}>
              Close
            </button>
          </div>
        )}

      </div>
    </div>
  );
}