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
  FaBug,
  FaFolder,
  FaFolderPlus,
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

  const createDefaultProject = (name = "Default Project") => ({
    name,
    files: [{ name: "untitled.c", content: defaultContent, warningsCount: 0 }],
    activeIndex: 0,
    warnings: [[]],
    markers: [[]],
  });

  const [projects, setProjects] = useState([createDefaultProject()]);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [astData, setAstData] = useState(null);
  const editorRef = useRef(null);

  // Ensure we always have valid data
  const currentProject = projects[activeProjectIndex] || createDefaultProject();
  const files = currentProject.files || [];
  const activeIndex = currentProject.activeIndex || 0;
  const warnings = currentProject.warnings || [[]];
  const markers = currentProject.markers || [[]];

  const updateCurrentProject = (updates) => {
    setProjects((prev) => {
      const newProjects = [...prev];
      if (newProjects[activeProjectIndex]) {
        newProjects[activeProjectIndex] = {
          ...newProjects[activeProjectIndex],
          ...updates,
        };
      }
      return newProjects;
    });
  };

  const setFiles = (newFiles) => {
    if (typeof newFiles === "function") {
      updateCurrentProject({ files: newFiles(files) });
    } else {
      updateCurrentProject({ files: newFiles });
    }
  };

  const setActiveIndex = (newIndex) =>
    updateCurrentProject({ activeIndex: newIndex });

  const setWarnings = (newWarnings) => {
    if (typeof newWarnings === "function") {
      updateCurrentProject({ warnings: newWarnings(warnings) });
    } else {
      updateCurrentProject({ warnings: newWarnings });
    }
  };

  const setMarkers = (newMarkers) => {
    if (typeof newMarkers === "function") {
      updateCurrentProject({ markers: newMarkers(markers) });
    } else {
      updateCurrentProject({ markers: newMarkers });
    }
  };

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

  useEffect(() => {
    handleLoad();
  }, []);

  useEffect(() => {
    if (!isAllDefaultProjects(projects, defaultContent)) {
      handleSave();
    }
  }, [projects]);

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
    link.download = `${currentProject.name}.zip`;
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

  const parseCCode = (code) => {
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

    return { markersArr, newWarnings };
  };

  useEffect(() => {
    // Only parse if we have valid files and activeIndex
    if (files.length > 0 && files[activeIndex]) {
      parseCCode(files[activeIndex].content || "", activeIndex);
    }
  }, [files, activeIndex, activeProjectIndex]);

  const handleNewProject = () => {
    if (projects.length >= 5) {
      alert("You can only have up to 5 projects at the same time.");
      return;
    }
    document.getElementById("new_project_modal").showModal();
  };

  const createProjectFromTemplate = (template) => {
    let idx = projects.length + 1;
    let name = template.name || `Project ${idx}`;
    const existingNames = projects.map((p) => p.name);
    while (existingNames.includes(name)) {
      idx++;
      name = template.name ? `${template.name} ${idx}` : `Project ${idx}`;
    }

    const newProject = {
      name,
      files: template.files.map((file) => ({ ...file, warningsCount: 0 })),
      activeIndex: 0,
      warnings: new Array(template.files.length).fill([]),
      markers: new Array(template.files.length).fill([]),
    };

    setProjects((prev) => [...prev, newProject]);
    setActiveProjectIndex(projects.length);
    document.getElementById("new_project_modal").close();
  };

  const projectTemplates = [
    {
      name: "Hello World",
      description: "Basic C program with main function",
      files: [{ name: "main.c", content: defaultContent }],
    },
    {
      name: "Multi-file Project",
      description: "Project with header and source files",
      files: [
        {
          name: "main.c",
          content: `#include <stdio.h>\n#include "utils.h"\n\nint main() {\n    printf("Hello from main!\\n");\n    greet("World");\n    return 0;\n}\n`,
        },
        {
          name: "utils.h",
          content: `#ifndef UTILS_H\n#define UTILS_H\n\nvoid greet(const char* name);\n\n#endif\n`,
        },
        {
          name: "utils.c",
          content: `#include <stdio.h>\n#include "utils.h"\n\nvoid greet(const char* name) {\n    printf("Hello, %s!\\n", name);\n}\n`,
        },
      ],
    },
    {
      name: "Data Structures",
      description: "Project with common data structure examples",
      files: [
        {
          name: "main.c",
          content: `#include <stdio.h>\n#include "list.h"\n\nint main() {\n    // Your data structure code here\n    return 0;\n}\n`,
        },
        {
          name: "list.h",
          content: `#ifndef LIST_H\n#define LIST_H\n\ntypedef struct Node {\n    int data;\n    struct Node* next;\n} Node;\n\nNode* createNode(int data);\nvoid printList(Node* head);\n\n#endif\n`,
        },
        {
          name: "list.c",
          content: `#include <stdio.h>\n#include <stdlib.h>\n#include "list.h"\n\nNode* createNode(int data) {\n    Node* newNode = malloc(sizeof(Node));\n    newNode->data = data;\n    newNode->next = NULL;\n    return newNode;\n}\n\nvoid printList(Node* head) {\n    Node* current = head;\n    while (current != NULL) {\n        printf("%d -> ", current->data);\n        current = current->next;\n    }\n    printf("NULL\\n");\n}\n`,
        },
      ],
    },
    {
      name: "Empty Project",
      description: "Start with a blank project",
      files: [{ name: "untitled.c", content: "" }],
    },
  ];

  const handleLoad = () => {
    const storedProjects = localStorage.getItem("myProjects");
    if (storedProjects) {
      setProjects(JSON.parse(storedProjects));
    } else {
      setProjects([createDefaultProject()]);
    }
    console.log("Loaded from localStorage");
  };

  const handleSave = () => {
    localStorage.setItem("myProjects", JSON.stringify(projects));
    console.log("Saved to localStorage");
  };

  const isAllDefaultProjects = (projects, defaultContent) => {
    if (projects.length !== 1) return false;
    const project = projects[0];
    return (
      project.name === "Default Project" &&
      project.files.length === 1 &&
      project.files[0].name === "untitled.c" &&
      project.files[0].content === defaultContent
    );
  };

  const handleRenameProject = (index) => {
    const newName = prompt("Enter new project name:", projects[index].name);
    if (newName && newName.trim()) {
      setProjects((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], name: newName.trim() };
        return updated;
      });
    }
  };

  const handleDeleteProject = (index) => {
    if (projects.length <= 1) return alert("At least one project must exist.");

    const projectName = projects[index].name;
    const firstConfirm = confirm(
      `Are you sure you want to delete the project "${projectName}"?`
    );

    if (!firstConfirm) return;

    const secondConfirm = confirm(
      `This action cannot be undone. Are you absolutely sure you want to delete "${projectName}"?`
    );

    if (!secondConfirm) return;

    setProjects((prev) => prev.filter((_, i) => i !== index));
    setActiveProjectIndex(
      index === activeProjectIndex ? 0 : Math.max(0, activeProjectIndex - 1)
    );
  };

  useEffect(() => {
    const currentFile = files[activeIndex];
    if (!currentFile) return;

    const { markersArr, newWarnings } = parseCCode(currentFile.content);

    setWarnings((prev) => {
      const arr = [...prev];
      arr[activeIndex] = newWarnings;
      return arr;
    });

    setMarkers((prev) => {
      const arr = [...prev];
      arr[activeIndex] = markersArr;
      return arr;
    });

    setFiles((prev) => {
      const updatedFiles = [...prev];
      if (updatedFiles[activeIndex]) {
        updatedFiles[activeIndex] = {
          ...updatedFiles[activeIndex],
          warningsCount: newWarnings.length,
        };
      }
      return updatedFiles;
    });
  }, [activeIndex, files[activeIndex]?.content]);

  const updateContent = (newValue) => {
    if (!files[activeIndex]) return;

    const updated = [...files];
    updated[activeIndex].content = newValue;
    setFiles(updated);

    if (editorRef.current) {
      const model = editorRef.current.getModel();
      const newMarkers = parseCCode(newValue);
      if (model) {
        window.monaco.editor.setModelMarkers(
          model,
          "owner",
          newMarkers.markersArr || []
        );
      }
    }
  };

  // 切換檔案時，設置對應的 markers
  useEffect(() => {
    if (editorRef.current && markers[activeIndex]) {
      const model = editorRef.current.getModel();
      if (model) {
        window.monaco.editor.setModelMarkers(
          model,
          "owner",
          markers[activeIndex]
        );
      }
    }
  }, [activeIndex, markers]);

  return (
    <div className="h-screen flex flex-col">
      <header className="navbar bg-base-100 p-4 shadow">
        <a className="btn btn-ghost text-xl">Simple C Editor</a>

        {/* Project Switcher */}
        <div className="flex items-center ml-auto gap-4">
          <div className="flex items-center gap-2">
            <FaFolder className="text-primary" size={20} />
            <select
              className="select select-bordered"
              value={activeProjectIndex}
              onChange={(e) => setActiveProjectIndex(parseInt(e.target.value))}
            >
              {projects.map((project, idx) => (
                <option key={idx} value={idx}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleNewProject}
              title="New Project"
            >
              <FaFolderPlus size={16} />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleRenameProject(activeProjectIndex)}
              title="Rename Project"
            >
              <FaEdit size={16} />
            </button>
            {projects.length > 1 && (
              <button
                className="btn btn-sm btn-error"
                onClick={() => handleDeleteProject(activeProjectIndex)}
                title="Delete Project"
              >
                <FaTrashAlt size={16} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              className="btn"
              onClick={() => document.getElementById("my_modal").showModal()}
            >
              <FaSitemap className="inline-block mr-2" />
              Site Guide
            </button>
            <button
              className="btn ml-2"
              onClick={() => document.getElementById("debug_modal").showModal()}
            >
              <FaBug className="inline-block mr-2" />
              Debug
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-3/5 border-r border-base-300">
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

        <div className="w-2/5 p-4 bg-base-300 overflow-hidden text-lg flex flex-col h-full">
          {/* 上半部：按鈕與檔案列表 */}
          <div className="flex-shrink-0">
            <div className="mb-4 flex justify-between flex-wrap">
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
                Download Project
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
                    {file.warningsCount === 0 && (
                      <span className="ml-2 badge badge-soft badge-success">
                        No syntax errors
                      </span>
                    )}
                    {file.warningsCount > 0 && (
                      <span className="ml-2 badge badge-soft badge-warning">
                        Warnings: {file.warningsCount}
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
        <div className="modal-box max-w-2xl">
          <h2 className="font-bold text-2xl mb-4">
            <FaSitemap className="inline-block mr-2" size={24} />
            Website Features
          </h2>
          <div className="py-4 space-y-4 text-base leading-relaxed">
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>Project Management:</strong> Create, rename, and delete
                up to 5 projects. Each project can contain up to 8 C files.
              </li>
              <li>
                <strong>File Management:</strong> Create, upload, rename,
                delete, and manage up to 8 C files per project. Download
                individual files or download the entire project as a ZIP
                archive.
              </li>
              <li>
                <strong>Code Editor:</strong> Leverage Monaco Editor with syntax
                highlighting, keyword auto-completion, and real-time error
                markers.
              </li>
              <li>
                <strong>Syntax Checking:</strong> Automatically detect and
                display syntax errors and warnings for each file.
              </li>
              <li>
                <strong>AST Viewer:</strong> Visualize the Abstract Syntax Tree
                (AST) of your C code in the right panel.
              </li>
              <li>
                <strong>Keyboard Shortcuts:</strong> Use <strong>Ctrl+S</strong>{" "}
                (or <strong>Cmd+S</strong> on Mac) to quickly download the
                current file.
              </li>
              <li>
                <strong>Local Storage:</strong> Automatically save and load your
                projects and files from local storage for persistent editing
                sessions.
              </li>
              <li>
                <strong>Debug Tools:</strong> Access debug tools to manually
                save or load projects from local storage and view stored data.
              </li>
            </ul>
            <div className="mt-6 text-sm text-gray-500">
              Use the navigation bar and buttons above to access all features.
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Close</button>
        </form>
      </dialog>

      <dialog id="debug_modal" className="modal">
        <div className="modal-box">
          <h2 className="font-bold text-lg">
            <FaBug className="inline-block mr-2" size={24} />
            Debug Tools
          </h2>
          <div className="py-4 space-y-4 text-base">
            <div className="flex justify-between">
              <button className="btn btn-info flex-1 mx-1" onClick={handleSave}>
                Save to localStorage
              </button>
              <button className="btn btn-info flex-1 mx-1" onClick={handleLoad}>
                Load from localStorage
              </button>
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-lg">LocalStorage Content:</h3>
              <pre className="text-xs bg-base-200 p-2 rounded mt-2 overflow-auto max-h-40">
                {localStorage.getItem("myProjects") ||
                  "No data in localStorage."}
              </pre>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Close</button>
        </form>
      </dialog>

      <dialog id="new_project_modal" className="modal">
        <div className="modal-box max-w-4xl">
          <h2 className="font-bold text-2xl mb-6">
            <FaFolderPlus className="inline-block mr-2" size={24} />
            Create New Project
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectTemplates.map((template, idx) => (
              <div
                key={idx}
                className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="card-body">
                  <h3 className="card-title text-lg">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {template.description}
                  </p>

                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2">
                      Files included:
                    </h4>
                    <ul className="text-xs space-y-1">
                      {template.files.map((file, fileIdx) => (
                        <li key={fileIdx} className="flex items-center">
                          <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="card-actions justify-end">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => createProjectFromTemplate(template)}
                    >
                      Create Project
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Cancel</button>
            </form>
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
