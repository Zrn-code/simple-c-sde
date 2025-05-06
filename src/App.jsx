import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import antlr4 from "antlr4";
import CLexer from "./antlr/CLexer";
import CParser from "./antlr/CParser";
import { BailErrorStrategy } from "antlr4";
import { FaEdit, FaTrashAlt } from "react-icons/fa";

function App() {
  const [files, setFiles] = useState([{ name: "untitled.c", content: "" }]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [warnings, setWarnings] = useState([]);
  const editorRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".c")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setFiles((prev) => [...prev, { name: file.name, content }]);
        setActiveIndex(files.length);
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a .c file!");
    }
  };

  const handleNewFile = () => {
    const newName = `untitled-${files.length + 1}.c`;
    setFiles((prev) => [...prev, { name: newName, content: "" }]);
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
    setFiles(updated);
    setActiveIndex(index === activeIndex ? 0 : Math.max(0, activeIndex - 1));
  };

  const parseCCode = (code) => {
    const chars = new antlr4.InputStream(code);
    const lexer = new CLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new CParser(tokens);
    const markers = [];
    const newWarnings = [];

    parser.removeErrorListeners();
    parser.addErrorListener({
      syntaxError: (recognizer, offendingSymbol, line, col, msg) => {
        markers.push({
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
      parser.compilationUnit();
    } catch (e) {
      newWarnings.push(`Parser exception: ${e.message}`);
    }

    setWarnings(newWarnings);
    return markers;
  };

  const updateContent = (newValue) => {
    if (!files[activeIndex]) return;

    const updated = [...files];
    updated[activeIndex].content = newValue;
    setFiles(updated);

    if (editorRef.current) {
      const model = editorRef.current.getModel();
      const markers = parseCCode(newValue);
      window.monaco.editor.setModelMarkers(model, "owner", markers);
    }
  };

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
            onMount={(editor) => (editorRef.current = editor)}
            onChange={(value) => updateContent(value || "")}
            options={{
              fontSize: 24,
              minimap: { enabled: false },
              wordWrap: "on",
            }}
          />
        </div>

        <div className="w-1/3 p-4 bg-gray-800 overflow-auto">
          <div className="mb-4 flex gap-2">
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

          <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 p-2 rounded text-sm">
            <strong>Warnings:</strong>
            <ul className="list-disc pl-5 mt-1">
              {warnings.length === 0 ? (
                <li>No syntax warnings.</li>
              ) : (
                warnings.map((warn, i) => <li key={i}>{warn}</li>)
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
