import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
} from "reactflow";
import "reactflow/dist/style.css";

export default function FlowChart() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    Papa.parse("/data/data.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;

        console.log("CSV RAW:", data);

        const tempNodes = [];
        const tempEdges = [];

        data.forEach((row, index) => {
          if (!row.id) return;

          // NODE
          tempNodes.push({
            id: String(row.id),
            data: {
              label: row.label || `Node ${row.id}`,
            },
            position: {
              x: (index % 4) * 200,
              y: Math.floor(index / 4) * 120,
            },
            style: {
              border: "1px solid #333",
              padding: 10,
              borderRadius: 5,
              background: "white",
            },
          });

          // EDGE
          if (row.next && row.next.trim() !== "") {
            tempEdges.push({
              id: `e${row.id}-${row.next}`,
              source: String(row.id),
              target: String(row.next),
            });
          }
        });

        console.log("NODES:", tempNodes);
        console.log("EDGES:", tempEdges);

        setNodes(tempNodes);
        setEdges(tempEdges);
      },
      error: (err) => {
        console.error("CSV ERROR:", err);
      },
    });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlowProvider>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}