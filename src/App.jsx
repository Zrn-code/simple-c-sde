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
  FaMoon,
  FaSun,
  FaSearchPlus,
  FaSearchMinus,
  FaSearch,
  FaListOl,
  FaExpandArrowsAlt,
  FaArrowRight,
} from "react-icons/fa";
import ASTViewer from "./components/ASTViewer";
import JSZip from "jszip";
import { defaultContent } from "./data/projectTemplates";
import { cFunctions, cTypes, createCSnippets } from "./data/cLanguageData";
import SiteGuideModal from "./components/SiteGuideModal";
import DebugModal from "./components/DebugModal";
import NewProjectModal from "./components/NewProjectModal";

// 在 module 頂層設置 flag，確保全程唯一
let cCompletionRegistered = false;

function App() {
  const createDefaultProject = (name = "Default Project") => ({
    name,
    files: [{ name: "untitled.c", content: defaultContent, warningsCount: 0 }],
    activeIndex: 0,
    warnings: [[]],
    markers: [[]],
  });

  // 初始化时先检查 localStorage
  const initializeProjects = () => {
    const storedProjects = localStorage.getItem("myProjects");
    if (storedProjects) {
      try {
        const parsedProjects = JSON.parse(storedProjects);
        // 验证数据结构的完整性
        if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
          return parsedProjects.map((project) => ({
            ...project,
            files: project.files || [],
            warnings: project.warnings || [],
            markers: project.markers || [],
            activeIndex: project.activeIndex || 0,
          }));
        }
      } catch (error) {
        console.error("Error parsing localStorage data:", error);
      }
    }
    return [createDefaultProject()];
  };

  const [projects, setProjects] = useState(initializeProjects);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [astData, setAstData] = useState(null);
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(24);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [recentFiles, setRecentFiles] = useState([]);
  const [activeGuideTab, setActiveGuideTab] = useState("overview");
  const [goToLineNumber, setGoToLineNumber] = useState("");
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

  const setActiveIndex = (newIndex) => {
    updateCurrentProject({ activeIndex: newIndex });
    updateRecentFiles(newIndex);
  };

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
    // 移除这个 useEffect，因为我们已经在 useState 中初始化了
    // handleLoad();
  }, []);

  useEffect(() => {
    if (!isAllDefaultProjects(projects, defaultContent)) {
      handleSave();
    }
  }, [projects]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // 避免重複註冊 provider
    if (!cCompletionRegistered) {
      monaco.languages.registerCompletionItemProvider("c", {
        triggerCharacters: [".", "#", "<", '"'],
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // Common C code snippets and constructs
          const cSnippets = createCSnippets(monaco, range);

          const suggestions = [
            ...cFunctions.map((fn) => ({
              label: fn,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: fn,
              range,
              detail: "C standard function",
            })),
            ...cTypes.map((type) => ({
              label: type,
              kind: monaco.languages.CompletionItemKind.TypeParameter,
              insertText: type,
              range,
              detail: "C data type",
            })),
            ...cSnippets,
          ];

          return { suggestions };
        },
      });
      cCompletionRegistered = true;
    }

    // 啟用快捷鍵
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.getAction("actions.find").run();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
      editor.getAction("editor.action.startFindReplaceAction").run();
    });
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

  const handleLoad = () => {
    const storedProjects = localStorage.getItem("myProjects");
    if (storedProjects) {
      try {
        const parsedProjects = JSON.parse(storedProjects);
        if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
          const validatedProjects = parsedProjects.map((project) => ({
            ...project,
            files: project.files || [],
            warnings: project.warnings || [],
            markers: project.markers || [],
            activeIndex: project.activeIndex || 0,
          }));
          setProjects(validatedProjects);
          console.log("Loaded from localStorage");
          return;
        }
      } catch (error) {
        console.error("Error parsing localStorage data:", error);
      }
    }
    // 只有在没有有效 localStorage 数据时才创建默认项目
    setProjects([createDefaultProject()]);
    console.log("Created default project");
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

  const toggleTheme = () => {
    setEditorTheme((prev) => {
      const newTheme = prev === "vs-dark" ? "light" : "vs-dark";
      // 立即更新 Monaco Editor 的主題
      if (editorRef.current && window.monaco) {
        window.monaco.editor.setTheme(newTheme);
      }
      return newTheme;
    });
  };

  const adjustFontSize = (delta) => {
    setFontSize((prev) => {
      const newSize = Math.max(12, Math.min(32, prev + delta));
      // 立即更新 Monaco Editor 的字體大小
      if (editorRef.current) {
        editorRef.current.updateOptions({
          fontSize: newSize,
        });
      }
      return newSize;
    });
  };

  const toggleLineNumbers = () => {
    setShowLineNumbers((prev) => {
      const newValue = !prev;
      // 立即更新 Monaco Editor 的選項
      if (editorRef.current) {
        editorRef.current.updateOptions({
          lineNumbers: newValue ? "on" : "off",
        });
      }
      return newValue;
    });
  };

  const toggleWordWrap = () => {
    setWordWrap((prev) => {
      const newValue = !prev;
      // 立即更新 Monaco Editor 的選項
      if (editorRef.current) {
        editorRef.current.updateOptions({
          wordWrap: newValue ? "on" : "off",
        });
      }
      return newValue;
    });
  };

  const goToLine = () => {
    if (editorRef.current && goToLineNumber) {
      const lineNum = parseInt(goToLineNumber);
      if (!isNaN(lineNum)) {
        const model = editorRef.current.getModel();
        if (model) {
          // Automatically clamp to valid range instead of showing alert
          const maxLines = model.getLineCount();
          const targetLine = Math.max(1, Math.min(maxLines, lineNum));

          editorRef.current.setPosition({ lineNumber: targetLine, column: 1 });
          editorRef.current.revealLineInCenter(targetLine);
          editorRef.current.focus();
          setGoToLineNumber(""); // Clear input after navigation
        }
      }
    }
  };
  const openFindReplace = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.startFindReplaceAction").run();
    }
  };

  const handleGoToLineKeyPress = (e) => {
    if (e.key === "Enter") {
      goToLine();
    }
  };

  const updateRecentFiles = (fileIndex) => {
    const fileName = files[fileIndex]?.name;
    if (!fileName) return;

    setRecentFiles((prev) => {
      const filtered = prev.filter((name) => name !== fileName);
      return [fileName, ...filtered].slice(0, 3);
    });
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

        {/* Editor Controls */}
        <div className="flex items-center gap-2 ml-4">
          <div className="tooltip tooltip-bottom" data-tip="Toggle Theme">
            <button className="btn btn-sm btn-ghost" onClick={toggleTheme}>
              {editorTheme === "vs-dark" ? (
                <FaSun size={16} />
              ) : (
                <FaMoon size={16} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <div
              className="tooltip tooltip-bottom"
              data-tip="Decrease Font Size"
            >
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => adjustFontSize(-2)}
              >
                <FaSearchMinus size={14} />
              </button>
            </div>
            <span className="text-sm px-2">{fontSize}px</span>
            <div
              className="tooltip tooltip-bottom"
              data-tip="Increase Font Size"
            >
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => adjustFontSize(2)}
              >
                <FaSearchPlus size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="tooltip tooltip-bottom" data-tip="Go to Line">
              <input
                type="number"
                placeholder="Line #"
                className="input input-sm w-20 text-center"
                value={goToLineNumber}
                onChange={(e) => setGoToLineNumber(e.target.value)}
                onKeyPress={handleGoToLineKeyPress}
                min="1"
              />
            </div>
            <button
              className="btn btn-sm btn-ghost"
              onClick={goToLine}
              disabled={!goToLineNumber}
            >
              <FaArrowRight size={16} />
            </button>
          </div>

          <div
            className="tooltip tooltip-bottom"
            data-tip="Find & Replace (Ctrl+H)"
          >
            <button className="btn btn-sm btn-ghost" onClick={openFindReplace}>
              <FaSearch size={16} />
            </button>
          </div>

          <div
            className="tooltip tooltip-bottom"
            data-tip="Toggle Line Numbers"
          >
            <button
              className={`btn btn-sm ${
                showLineNumbers ? "btn-primary" : "btn-ghost"
              }`}
              onClick={toggleLineNumbers}
            >
              <FaListOl size={16} />
            </button>
          </div>

          <div className="tooltip tooltip-bottom" data-tip="Toggle Word Wrap">
            <button
              className={`btn btn-sm ${wordWrap ? "btn-primary" : "btn-ghost"}`}
              onClick={toggleWordWrap}
            >
              <FaExpandArrowsAlt size={16} />
            </button>
          </div>
        </div>

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
              <FaBug className="inline-block" />
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
            theme={editorTheme}
            onMount={handleEditorMount}
            onChange={(value) => updateContent(value || "")}
            options={{
              fontSize: fontSize,
              minimap: { enabled: false },
              wordWrap: wordWrap ? "on" : "off",
              lineNumbers: showLineNumbers ? "on" : "off",
              folding: true,
              bracketMatching: "always",
              autoIndent: "full",
              formatOnPaste: true,
              formatOnType: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              scrollBeyondLastLine: false,
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

            {/* Recent Files */}
            {recentFiles.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2 text-gray-600">
                  Recently Edited:
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {recentFiles.map((fileName, idx) => (
                    <span key={idx} className="badge badge-primary badge-sm">
                      {fileName}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                      {recentFiles.includes(file.name) && (
                        <span className="ml-2 text-xs opacity-75">●</span>
                      )}
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

      <SiteGuideModal
        activeGuideTab={activeGuideTab}
        setActiveGuideTab={setActiveGuideTab}
      />

      <DebugModal handleSave={handleSave} handleLoad={handleLoad} />

      <NewProjectModal createProjectFromTemplate={createProjectFromTemplate} />
    </div>
  );
}

export default App;
