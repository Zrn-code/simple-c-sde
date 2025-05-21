import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import antlr4 from "antlr4";
import CLexer from "./antlr/CLexer";
import CParser from "./antlr/CParser";
import { BailErrorStrategy } from "antlr4";
import {
  FaEdit,
  FaTrashAlt,
  FaDownload,
  FaPlus,
  FaUpload,
  FaSitemap,
  FaExclamationTriangle,
  FaCheckCircle,
  FaFileArchive,
} from "react-icons/fa";
import cKeywords from "./cKeywords.json";
import ASTViewer from "./ASTViewer";
import JSZip from "jszip";

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
  }, [files, activeIndex]);

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

  useEffect(() => {
    parseCCode(files[activeIndex]?.content || "", activeIndex);
  }, [activeIndex]);

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
      // 檢查名稱是否重複，若重複則自動加編號
      let base = file.name.replace(/\.c$/, "");
      let ext = ".c";
      let name = file.name;
      let counter = 1;
      const existingNames = files.map((f) => f.name);
      while (existingNames.includes(name)) {
        name = `${base} (${counter})${ext}`;
        counter++;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setFiles((prev) => [...prev, { name, content }]);
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
    // 產生不重複的 untitled 名稱
    let idx = files.length + 1;
    let name = `untitled-${idx}.c`;
    const existingNames = files.map((f) => f.name);
    while (existingNames.includes(name)) {
      idx++;
      name = `untitled-${idx}.c`;
    }
    setFiles((prev) => [...prev, { name, content: defaultContent }]);
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

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.name, file.content);
    }
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "all_files.zip";
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
    <div className="h-screen flex flex-col">
      <header className="navbar bg-base-100 p-4 shadow">
        <a className="btn btn-ghost text-xl">Simple C Editor</a>
        <div className="ml-auto">
          <button
            className="btn"
            onClick={() => document.getElementById("my_modal").showModal()}
          >
            <FaSitemap className="inline-block mr-2" />
            Site Guide
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-2/3 border-r border-base-300">
          <Editor
            height="100%"
            language="c"
            value={files[activeIndex]?.content || ""}
            theme="vs-dark"
            onMount={handleEditorMount}
            onChange={(value) => updateContent(value || "")}
            options={{
              fontSize: 24,
              minimap: { enabled: false },
              wordWrap: "on",
            }}
          />
        </div>

        <div className="w-1/3 p-4 bg-base-300 overflow-hidden text-lg flex flex-col h-full">
          {/* 上半部：按鈕與檔案列表 */}
          <div className="flex-shrink-0">
            <div className="mb-4 flex gap-2 flex-wrap">
              <button onClick={handleNewFile} className="btn btn-info">
                <FaPlus className="inline mr-2" size={20} />
                New C File
              </button>
              <label className="btn btn-info">
                <FaUpload className="inline mr-2" size={20} />
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
                className="btn btn-info"
                title="Download (Ctrl+S)"
              >
                <FaDownload className="inline mr-2" size={20} />
                Download
              </button>
              <button onClick={handleDownloadAll} className="btn btn-info">
                <FaFileArchive className="inline mr-2" size={20} />
                Download All
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={`flex flex-row items-center px-4 py-2 rounded cursor-pointer flex-1 ${
                      idx === activeIndex
                        ? "bg-primary text-primary-content border border-primary"
                        : "bg-base-300 hover:bg-base-200 text-base-content border border-base-300"
                    }`}
                    onClick={() => setActiveIndex(idx)}
                  >
                    <span
                      className={`flex-1 text-left ${
                        idx === activeIndex ? "font-bold" : "text-gray-400"
                      }`}
                    >
                      {file.name}
                    </span>
                    {warnings[idx] && warnings[idx].length === 0 && (
                      <span className="ml-2 badge badge-soft badge-success">
                        No syntax errors
                      </span>
                    )}
                    {warnings[idx] && warnings[idx].length > 0 && (
                      <span className="ml-2 badge badge-soft badge-warning">
                        Warning
                        {warnings[idx].length > 1
                          ? `s(${warnings[idx].length})`
                          : ""}
                        {warnings[idx].length === 1 ? "(1)" : ""}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameFile(idx);
                      }}
                      className={`p-1 ml-2 ${
                        idx === activeIndex ? "text-warning" : "text-gray-400"
                      }`}
                      title="Rename"
                      style={{ cursor: "pointer" }}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(idx);
                      }}
                      className={`p-1 ml-1 ${
                        idx === activeIndex ? "text-error" : "text-gray-400"
                      }`}
                      title="Delete"
                      style={{ cursor: "pointer" }}
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 下半部：AST viewer 與 warnings，AST viewer 填滿，warnings 固定底部 */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-auto">
              <ASTViewer astData={astData} />
            </div>
            <div
              role="alert"
              className="alert alert-soft mt-4 flex-shrink-0 text-xl font-semibold"
            >
              {!warnings[activeIndex] || warnings[activeIndex].length === 0 ? (
                <div className="flex items-center gap-2 mb-1 text-success text-xl font-semibold">
                  <FaCheckCircle className="text-success" size={20} />
                  <span>No syntax errors.</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1 text-xl text-warning font-semibold">
                    <FaExclamationTriangle className="text-warning" size={20} />
                    <strong>
                      Warnings
                      {warnings[activeIndex] && warnings[activeIndex].length > 0
                        ? `(${warnings[activeIndex].length})`
                        : ""}
                    </strong>
                  </div>
                  <ul className="list-disc pl-5 mt-1 text-lg">
                    {warnings[activeIndex].map((warn, i) => (
                      <li className="text-warning" key={i}>
                        {warn}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <dialog id="my_modal" className="modal">
        <div className="modal-box">
          <h2 className="font-bold   text-lg">
            <FaSitemap className="inline-block mr-2" size={24} />
            Website Features
          </h2>
          <div className="py-4 space-y-2 text-base">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>File Management:</strong> Create, upload, rename, and
                delete up to 8 C files. Download your code anytime.
              </li>
              <li>
                <strong>Code Editor:</strong> Enjoy syntax highlighting, keyword
                auto-completion, and error markers powered by Monaco Editor.
              </li>
              <li>
                <strong>Syntax Checking:</strong> Real-time syntax error and
                warning display for each file.
              </li>
              <li>
                <strong>AST Viewer:</strong> Visualize the Abstract Syntax Tree
                (AST) of your C code in the right panel.
              </li>
              <li>
                <strong>Keyboard Shortcut:</strong> Press{" "}
                <strong>Ctrl+S</strong> (or <strong>Cmd+S</strong> on Mac) to
                quickly download the current file.
              </li>
            </ul>
            <div className="mt-4 text-sm text-gray-500">
              Use the navigation bar and buttons above to access all features.
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default App;
