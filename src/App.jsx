import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import antlr4 from "antlr4";
import CLexer from "./antlr/CLexer";
import CParser from "./antlr/CParser";
import { BailErrorStrategy } from "antlr4";
import { FaEdit, FaTrashAlt, FaDownload } from "react-icons/fa";
import Tree from "react-d3-tree";
import cKeywords from "./cKeywords.json";

// 在 module 頂層設置 flag，確保全程唯一
let cCompletionRegistered = false;

function App() {
  const defaultContent = `#include <stdio.h>

int main() {
    printf("Hello, world!\\n");
    return 0;
}
`;
  const [files, setFiles] = useState([
    { name: "untitled.c", content: defaultContent },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  // 新增一個 warnings 狀態，改為陣列，每個檔案一組 warnings
  const [warnings, setWarnings] = useState([[]]);
  // 新增一個 markers 狀態，改為陣列，每個檔案一組 markers
  const [markers, setMarkers] = useState([[]]);
  const [astData, setAstData] = useState(null);
  const editorRef = useRef(null);

  useEffect(() => {
    // 初始時就解析 AST 與警告
    parseCCode(files[activeIndex]?.content || "", activeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 僅在初始時執行

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    // 使用 JSON 檔案的關鍵字，並去除重複
    const keywords = Array.from(new Set(cKeywords));
    // 避免重複註冊 provider
    if (!cCompletionRegistered) {
      monaco.languages.registerCompletionItemProvider("c", {
        triggerCharacters: ["."],
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return {
            suggestions: keywords.map((kw) => ({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw,
              range,
            })),
          };
        },
      });
      cCompletionRegistered = true;
    }
  };

  const handleFileUpload = (e) => {
    if (files.length >= 8) {
      alert("You can only edit up to 8 files at the same time.");
      return;
    }
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".c")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setFiles((prev) => [...prev, { name: file.name, content }]);
        setWarnings((prev) => [...prev, []]);
        setMarkers((prev) => [...prev, []]);
        setActiveIndex(files.length);
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a .c file!");
    }
  };

  const handleNewFile = () => {
    if (files.length >= 8) {
      alert("You can only edit up to 8 files at the same time.");
      return;
    }
    const newName = `untitled-${files.length + 1}.c`;
    setFiles((prev) => [...prev, { name: newName, content: defaultContent }]);
    setWarnings((prev) => [...prev, []]);
    setMarkers((prev) => [...prev, []]);
    setActiveIndex(files.length);
  };

  const handleRenameFile = (index) => {
    const newName = prompt("Enter new filename:", files[index].name);
    if (newName && newName.trim()) {
      const updated = [...files];
      updated[index].name = newName.trim();
      setFiles(updated);
    }
  };

  const handleDeleteFile = (index) => {
    if (files.length <= 1) return alert("At least one file must exist.");
    const updated = files.filter((_, i) => i !== index);
    const updatedWarnings = warnings.filter((_, i) => i !== index);
    const updatedMarkers = markers.filter((_, i) => i !== index);
    setFiles(updated);
    setWarnings(updatedWarnings);
    setMarkers(updatedMarkers);
    setActiveIndex(index === activeIndex ? 0 : Math.max(0, activeIndex - 1));
  };

  const handleDownload = () => {
    const file = files[activeIndex];
    const blob = new Blob([file.content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const buildAstTree = (node, parser) => {
    if (!node) return null;
    const name = parser.ruleNames[node.ruleIndex] || node.getText();
    const children = [];
    for (let i = 0; i < node.getChildCount(); i++) {
      const child = node.getChild(i);
      if (child.ruleIndex !== undefined) {
        children.push(buildAstTree(child, parser));
      } else {
        children.push({ name: child.getText() });
      }
    }
    return { name, children };
  };

  const parseCCode = (code, idx) => {
    const chars = new antlr4.InputStream(code);
    const lexer = new CLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new CParser(tokens);
    const markersArr = [];
    const newWarnings = [];
    parser.removeErrorListeners();
    parser.addErrorListener({
      syntaxError: (recognizer, offendingSymbol, line, col, msg) => {
        markersArr.push({
          startLineNumber: line,
          startColumn: col + 1,
          endLineNumber: line,
          endColumn: col + 2,
          message: msg,
          severity: 8,
        });
        newWarnings.push(`Line ${line}:${col} - ${msg}`);
      },
    });
    parser.errorHandler = new BailErrorStrategy();

    try {
      const tree = parser.compilationUnit();
      setAstData(buildAstTree(tree, parser));
    } catch (e) {
      newWarnings.push(`Parser exception: ${e.message}`);
      setAstData(null);
    }
    // 更新對應檔案的 warnings 和 markers
    setWarnings((prev) => {
      const arr = [...prev];
      arr[idx] = newWarnings;
      return arr;
    });
    setMarkers((prev) => {
      const arr = [...prev];
      arr[idx] = markersArr;
      return arr;
    });
    return markersArr;
  };

  const updateContent = (newValue) => {
    if (!files[activeIndex]) return;

    const updated = [...files];
    updated[activeIndex].content = newValue;
    setFiles(updated);

    if (editorRef.current) {
      const model = editorRef.current.getModel();
      const newMarkers = parseCCode(newValue, activeIndex);
      window.monaco.editor.setModelMarkers(model, "owner", newMarkers);
    }
  };

  // 切換檔案時，設置對應的 markers
  useEffect(() => {
    if (editorRef.current && markers[activeIndex]) {
      const model = editorRef.current.getModel();
      window.monaco.editor.setModelMarkers(
        model,
        "owner",
        markers[activeIndex]
      );
    }
  }, [activeIndex, markers]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <header className="bg-gray-800 text-white text-xl font-bold p-4">
        Simple C Editor
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-2/3 border-r border-gray-700">
          <Editor
            height="100%"
            language="c"
            value={files[activeIndex]?.content || ""}
            theme="vs-dark"
            onMount={handleEditorMount} // 修改這裡
            onChange={(value) => updateContent(value || "")}
            options={{
              fontSize: 24,
              minimap: { enabled: false },
              wordWrap: "on",
            }}
          />
        </div>

        <div className="w-1/3 p-4 bg-gray-800 overflow-auto text-lg flex flex-col">
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={handleNewFile}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              New C File
            </button>
            <label className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600">
              Upload C File
              <input
                type="file"
                accept=".c"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <button
              onClick={handleDownload}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
              title="Download (Ctrl+S)"
            >
              <FaDownload className="inline mr-2" />
              Download
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button
                  onClick={() => setActiveIndex(idx)}
                  className={`flex-1 text-left px-4 py-2 rounded ${
                    idx === activeIndex
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  {file.name}
                </button>
                <button
                  onClick={() => handleRenameFile(idx)}
                  className="p-1 text-yellow-400 hover:text-yellow-300"
                  title="Rename"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDeleteFile(idx)}
                  className="p-1 text-red-500 hover:text-red-400"
                  title="Delete"
                >
                  <FaTrashAlt />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-base-100 border-base-300 collapse border rounded-lg mb-4">
            <input type="checkbox" className="peer" />
            <div className="collapse-title text-lg font-medium">AST Viewer</div>
            <div className="collapse-content ">
              <div
                className="p-2 rounded text-sm mb-4"
                style={{
                  height: 500,
                  width: "100%",
                  background: "#f3f4f6", // 更亮的背景
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
                      styles={{
                        nodes: {
                          node: {
                            circle: {
                              fill: "#facc15",
                              stroke: "#f59e42",
                              strokeWidth: 3,
                              r: 18,
                              filter: "drop-shadow(0 2px 6px #0008)",
                            },
                            name: {
                              fontSize: "1.25rem",
                              fill: "#18181b",
                              fontWeight: "bold",
                              textShadow: "0 1px 2px #fff8",
                            },
                            attributes: {
                              fontSize: "1rem",
                              fill: "#f59e42",
                            },
                          },
                          leafNode: {
                            circle: {
                              fill: "#38bdf8",
                              stroke: "#0ea5e9",
                              strokeWidth: 3,
                              r: 16,
                              filter: "drop-shadow(0 2px 6px #0008)",
                            },
                            name: {
                              fontSize: "1.1rem",
                              fill: "#18181b",
                              fontWeight: "bold",
                              textShadow: "0 1px 2px #fff8",
                            },
                            attributes: {
                              fontSize: "0.95rem",
                              fill: "#0ea5e9",
                            },
                          },
                        },
                        links: {
                          stroke: "#facc15",
                          strokeWidth: 3,
                        },
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-xs mt-1">No AST generated.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 p-2 rounded text-sm">
            <strong>Warnings:</strong>
            <ul className="list-disc pl-5 mt-1">
              {!warnings[activeIndex] || warnings[activeIndex].length === 0 ? (
                <li>No syntax warnings.</li>
              ) : (
                warnings[activeIndex].map((warn, i) => <li key={i}>{warn}</li>)
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
