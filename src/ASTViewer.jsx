import Tree from "react-d3-tree";

export default function ASTViewer({ astData }) {
  // collapseNeighborNodes 預設為 true，且不再需要 setState
  const collapseNeighborNodes = true;

  return (
    <div className="bg-base-100 border-base-300 collapse collapse-arrow border rounded-lg mb-4">
      <input type="checkbox" className="peer" />
      <div className="collapse-title text-lg font-medium">AST Viewer</div>
      <div className="collapse-content ">
        {/* 移除 toggle UI */}
        <div
          className="p-2 rounded text-sm mb-4"
          style={{
            height: 500,
            width: "100%",
            background: "#f3f4f6",
            border: "2px solid #6366f1",
            overflow: "auto",
          }}
        >
          {astData ? (
            <div style={{ width: "100%", height: "100%" }}>
              <Tree
                data={astData}
                orientation="vertical"
                pathFunc="elbow"
                translate={{ x: 250, y: 80 }}
                nodeSize={{ x: 200, y: 80 }}
                enableLegacyTransitions={true}
                collapseNeighborNodes={collapseNeighborNodes}
              />
            </div>
          ) : (
            <p className="text-xs mt-1">No AST generated.</p>
          )}
        </div>
      </div>
    </div>
  );
}
