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
  FaAlignLeft,
  FaSearch,
  FaListOl,
  FaExpandArrowsAlt,
} from "react-icons/fa";
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
    // C 語言的函數和常見類型
    const cFunctions = [
      "printf",
      "scanf",
      "malloc",
      "free",
      "strlen",
      "strcpy",
      "strcmp",
      "strcat",
      "fopen",
      "fclose",
      "fread",
      "fwrite",
      "getchar",
      "putchar",
    ];

    const cTypes = [
      "int",
      "char",
      "float",
      "double",
      "void",
      "long",
      "short",
      "unsigned",
      "signed",
      "const",
      "static",
      "extern",
      "register",
      "volatile",
    ];

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
          const cSnippets = [
            {
              label: "for",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText:
                "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3:// code}\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "for loop",
              documentation: "Standard for loop with iterator",
            },
            {
              label: "while",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "while (${1:condition}) {\n\t${2:// code}\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "while loop",
              documentation: "While loop with condition",
            },
            {
              label: "do-while",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "do {\n\t${1:// code}\n} while (${2:condition});",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "do-while loop",
              documentation: "Do-while loop",
            },
            {
              label: "if",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "if (${1:condition}) {\n\t${2:// code}\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "if statement",
              documentation: "If conditional statement",
            },
            {
              label: "if-else",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText:
                "if (${1:condition}) {\n\t${2:// if code}\n} else {\n\t${3:// else code}\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "if-else statement",
              documentation: "If-else conditional statement",
            },
            {
              label: "switch",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText:
                "switch (${1:variable}) {\n\tcase ${2:value1}:\n\t\t${3:// code}\n\t\tbreak;\n\tcase ${4:value2}:\n\t\t${5:// code}\n\t\tbreak;\n\tdefault:\n\t\t${6:// default code}\n\t\tbreak;\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "switch statement",
              documentation: "Switch-case statement",
            },
            {
              label: "function",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText:
                "${1:int} ${2:functionName}(${3:parameters}) {\n\t${4:// code}\n\treturn ${5:value};\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "function definition",
              documentation: "Function definition template",
            },
            {
              label: "main",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "int main() {\n\t${1:// code}\n\treturn 0;\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "main function",
              documentation: "Main function template",
            },
            {
              label: "printf",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'printf("${1:format}", ${2:args});',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "printf statement",
              documentation: "Printf function call",
            },
            {
              label: "scanf",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'scanf("${1:format}", ${2:&variable});',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "scanf statement",
              documentation: "Scanf function call",
            },
            {
              label: "include",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "#include <${1:header}>",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "include directive",
              documentation: "Include header file",
            },
            {
              label: "struct",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText:
                "typedef struct {\n\t${1:// members}\n} ${2:StructName};",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              detail: "struct definition",
              documentation: "Structure definition template",
            },
          ];

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

  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument").run();
    }
  };

  const openFindReplace = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.startFindReplaceAction").run();
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

          <div className="tooltip tooltip-bottom" data-tip="Format Code">
            <button className="btn btn-sm btn-ghost" onClick={formatCode}>
              <FaAlignLeft size={16} />
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

      <dialog id="my_modal" className="modal">
        <div className="modal-box max-w-6xl max-h-none h-auto">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>

          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-3xl">
              <FaSitemap className="inline-block mr-3 text-primary" size={32} />
              Website Features Guide
            </h2>
          </div>

          {/* Tab Navigation */}
          <div className="tabs tabs-boxed mb-6 bg-base-200">
            <button
              className={`tab tab-lg ${
                activeGuideTab === "overview" ? "tab-active" : ""
              }`}
              onClick={() => setActiveGuideTab("overview")}
            >
              <FaSitemap className="mr-2" size={16} />
              Overview
            </button>
            <button
              className={`tab tab-lg ${
                activeGuideTab === "projects" ? "tab-active" : ""
              }`}
              onClick={() => setActiveGuideTab("projects")}
            >
              <FaFolder className="mr-2" size={16} />
              Projects
            </button>
            <button
              className={`tab tab-lg ${
                activeGuideTab === "editor" ? "tab-active" : ""
              }`}
              onClick={() => setActiveGuideTab("editor")}
            >
              <FaEdit className="mr-2" size={16} />
              Editor
            </button>
            <button
              className={`tab tab-lg ${
                activeGuideTab === "shortcuts" ? "tab-active" : ""
              }`}
              onClick={() => setActiveGuideTab("shortcuts")}
            >
              ⌨️ Shortcuts
            </button>
            <button
              className={`tab tab-lg ${
                activeGuideTab === "technical" ? "tab-active" : ""
              }`}
              onClick={() => setActiveGuideTab("technical")}
            >
              ⚙️ Technical
            </button>
          </div>

          {/* Tab Content - 移除高度限制和滚动 */}
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeGuideTab === "overview" && (
              <div className="space-y-6">
                <div className="hero bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6">
                  <div className="hero-content text-center">
                    <div className="max-w-md">
                      <h1 className="text-3xl font-bold">Simple C Editor</h1>
                      <p className="py-6">
                        A powerful, browser-based C development environment with
                        real-time syntax checking, AST visualization, and
                        intelligent code completion.
                      </p>
                      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-100">
                        <div className="stat">
                          <div className="stat-title">Projects</div>
                          <div className="stat-value text-primary">5</div>
                          <div className="stat-desc">Maximum allowed</div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">Files per Project</div>
                          <div className="stat-value text-secondary">8</div>
                          <div className="stat-desc">C files supported</div>
                        </div>
                        <div className="stat">
                          <div className="stat-title">Parser</div>
                          <div className="stat-value text-accent">ANTLR4</div>
                          <div className="stat-desc">Real-time analysis</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="card bg-primary text-primary-content">
                    <div className="card-body">
                      <h2 className="card-title">
                        <FaFolder size={24} />
                        Project Management
                      </h2>
                      <p>
                        Create, manage, and organize multiple C projects with
                        templates.
                      </p>
                    </div>
                  </div>

                  <div className="card bg-secondary text-secondary-content">
                    <div className="card-body">
                      <h2 className="card-title">
                        <FaEdit size={24} />
                        Smart Editor
                      </h2>
                      <p>
                        Monaco Editor with syntax highlighting and intelligent
                        autocomplete.
                      </p>
                    </div>
                  </div>

                  <div className="card bg-accent text-accent-content">
                    <div className="card-body">
                      <h2 className="card-title">🌳 AST Viewer</h2>
                      <p>
                        Real-time Abstract Syntax Tree visualization for your
                        code.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info">
                  <FaCheckCircle />
                  <div>
                    <h3 className="font-bold">Perfect for Learning!</h3>
                    <div className="text-sm">
                      Ideal for C programming students, coding interviews, and
                      rapid prototyping.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeGuideTab === "projects" && (
              <div className="space-y-6">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-bold text-xl mb-4 text-primary flex items-center">
                    <FaFolder className="mr-3" size={24} />
                    Project Management
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h4 className="card-title text-lg">Create Projects</h4>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Up to 5 projects simultaneously</li>
                          <li>Choose from 4 pre-built templates</li>
                          <li>Auto-naming for duplicates</li>
                        </ul>
                      </div>
                    </div>

                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h4 className="card-title text-lg">
                          Project Templates
                        </h4>
                        <div className="space-y-2">
                          <div className="badge badge-primary badge-sm">
                            Hello World
                          </div>
                          <div className="badge badge-secondary badge-sm">
                            Multi-file Project
                          </div>
                          <div className="badge badge-accent badge-sm">
                            Data Structures
                          </div>
                          <div className="badge badge-neutral badge-sm">
                            Empty Project
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="collapse collapse-arrow bg-base-200 mb-4">
                    <input
                      type="radio"
                      name="project-accordion"
                      defaultChecked
                    />
                    <div className="collapse-title text-lg font-medium">
                      📄 File Management Features
                    </div>
                    <div className="collapse-content">
                      <ul className="list-disc pl-6 space-y-2">
                        <li>
                          <strong>File Operations:</strong> Create, upload,
                          rename, and delete .c files
                        </li>
                        <li>
                          <strong>File Limits:</strong> Up to 8 C files per
                          project for optimal performance
                        </li>
                        <li>
                          <strong>Smart Naming:</strong> Automatic handling of
                          duplicate names with suffixes
                        </li>
                        <li>
                          <strong>Download Options:</strong> Individual files or
                          complete ZIP archives
                        </li>
                        <li>
                          <strong>Recent Files:</strong> Visual tracking with
                          indicators (●) for quick access
                        </li>
                        <li>
                          <strong>Status Indicators:</strong> Real-time error
                          count with color-coded badges
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="collapse collapse-arrow bg-base-200">
                    <input type="radio" name="project-accordion" />
                    <div className="collapse-title text-lg font-medium">
                      💾 Persistent Storage
                    </div>
                    <div className="collapse-content">
                      <div className="alert alert-success">
                        <FaCheckCircle />
                        <div>
                          <div className="font-bold">Automatic Saving</div>
                          <div className="text-sm">
                            All projects saved to localStorage and restored on
                            refresh
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Editor Tab */}
            {activeGuideTab === "editor" && (
              <div className="space-y-6">
                <div className="border-l-4 border-accent pl-4">
                  <h3 className="font-bold text-xl mb-4 text-accent flex items-center">
                    <FaEdit className="mr-3" size={24} />
                    Advanced Code Editor
                  </h3>

                  <div className="tabs tabs-lifted">
                    <input
                      type="radio"
                      name="editor-tabs"
                      role="tab"
                      className="tab"
                      aria-label="Features"
                      defaultChecked
                    />
                    <div
                      role="tabpanel"
                      className="tab-content bg-base-100 border-base-300 rounded-box p-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-bold text-lg mb-3">
                            Core Features
                          </h4>
                          <ul className="list-disc pl-6 space-y-2">
                            <li>
                              <strong>Monaco Editor:</strong> VS Code-like
                              experience
                            </li>
                            <li>
                              <strong>Syntax Highlighting:</strong> Full C
                              language support
                            </li>
                            <li>
                              <strong>Error Detection:</strong> ANTLR4-powered
                              real-time analysis
                            </li>
                            <li>
                              <strong>Code Formatting:</strong> Auto-indent and
                              manual formatting
                            </li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-bold text-lg mb-3">
                            Smart Features
                          </h4>
                          <ul className="list-disc pl-6 space-y-2">
                            <li>
                              <strong>IntelliSense:</strong> Context-aware
                              suggestions
                            </li>
                            <li>
                              <strong>Code Folding:</strong> Collapse/expand
                              blocks
                            </li>
                            <li>
                              <strong>Bracket Matching:</strong> Automatic pair
                              highlighting
                            </li>
                            <li>
                              <strong>Multi-cursor:</strong> Edit multiple lines
                              simultaneously
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="editor-tabs"
                      role="tab"
                      className="tab"
                      aria-label="Autocomplete"
                    />
                    <div
                      role="tabpanel"
                      className="tab-content bg-base-100 border-base-300 rounded-box p-6"
                    >
                      <h4 className="font-bold text-lg mb-3">
                        Intelligent Autocomplete
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card bg-primary/10">
                          <div className="card-body">
                            <h5 className="card-title text-sm">Functions</h5>
                            <div className="text-xs space-y-1">
                              <div className="badge badge-xs">printf</div>
                              <div className="badge badge-xs">scanf</div>
                              <div className="badge badge-xs">malloc</div>
                              <div className="badge badge-xs">free</div>
                            </div>
                          </div>
                        </div>

                        <div className="card bg-secondary/10">
                          <div className="card-body">
                            <h5 className="card-title text-sm">Data Types</h5>
                            <div className="text-xs space-y-1">
                              <div className="badge badge-xs">int</div>
                              <div className="badge badge-xs">char</div>
                              <div className="badge badge-xs">float</div>
                              <div className="badge badge-xs">double</div>
                            </div>
                          </div>
                        </div>

                        <div className="card bg-accent/10">
                          <div className="card-body">
                            <h5 className="card-title text-sm">Snippets</h5>
                            <div className="text-xs space-y-1">
                              <div className="badge badge-xs">for loop</div>
                              <div className="badge badge-xs">if-else</div>
                              <div className="badge badge-xs">function</div>
                              <div className="badge badge-xs">struct</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="editor-tabs"
                      role="tab"
                      className="tab"
                      aria-label="Customization"
                    />
                    <div
                      role="tabpanel"
                      className="tab-content bg-base-100 border-base-300 rounded-box p-6"
                    >
                      <h4 className="font-bold text-lg mb-3">
                        🎨 Editor Customization
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="form-control">
                            <label className="label cursor-pointer">
                              <span className="label-text">Dark Theme</span>
                              <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                defaultChecked
                              />
                            </label>
                          </div>
                          <div className="form-control">
                            <label className="label cursor-pointer">
                              <span className="label-text">Line Numbers</span>
                              <input
                                type="checkbox"
                                className="toggle toggle-secondary"
                                defaultChecked
                              />
                            </label>
                          </div>
                          <div className="form-control">
                            <label className="label cursor-pointer">
                              <span className="label-text">Word Wrap</span>
                              <input
                                type="checkbox"
                                className="toggle toggle-accent"
                                defaultChecked
                              />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="label">
                              <span className="label-text">Font Size</span>
                            </label>
                            <input
                              type="range"
                              min="12"
                              max="32"
                              value="24"
                              className="range range-primary"
                            />
                            <div className="w-full flex justify-between text-xs px-2">
                              <span>12px</span>
                              <span>24px</span>
                              <span>32px</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shortcuts Tab */}
            {activeGuideTab === "shortcuts" && (
              <div className="space-y-6">
                <div className="border-l-4 border-success pl-4">
                  <h3 className="font-bold text-xl mb-4 text-success flex items-center">
                    ⌨️ Keyboard Shortcuts
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h4 className="card-title">File Operations</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span>Quick Download</span>
                            <div className="space-x-1">
                              <kbd className="kbd kbd-sm">Ctrl</kbd>
                              <kbd className="kbd kbd-sm">S</kbd>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Find Text</span>
                            <div className="space-x-1">
                              <kbd className="kbd kbd-sm">Ctrl</kbd>
                              <kbd className="kbd kbd-sm">F</kbd>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Find & Replace</span>
                            <div className="space-x-1">
                              <kbd className="kbd kbd-sm">Ctrl</kbd>
                              <kbd className="kbd kbd-sm">H</kbd>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h4 className="card-title">Code Editing</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span>Toggle Comment</span>
                            <div className="space-x-1">
                              <kbd className="kbd kbd-sm">Ctrl</kbd>
                              <kbd className="kbd kbd-sm">/</kbd>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Auto-complete</span>
                            <kbd className="kbd kbd-sm">Tab</kbd>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Trigger IntelliSense</span>
                            <div className="space-x-1">
                              <kbd className="kbd kbd-sm">Ctrl</kbd>
                              <kbd className="kbd kbd-sm">Space</kbd>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-info/10 rounded-lg">
                    <h4 className="font-bold mb-2">💡 Pro Tips</h4>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>
                        Type "for", "if", "printf", etc., and press{" "}
                        <kbd className="kbd kbd-xs">Tab</kbd> for quick
                        templates
                      </li>
                      <li>
                        Use <kbd className="kbd kbd-xs">Ctrl</kbd>+
                        <kbd className="kbd kbd-xs">S</kbd> frequently to backup
                        important files
                      </li>
                      <li>The AST viewer updates in real-time as you type</li>
                      <li>
                        Right-click in the editor for context menu options
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Tab */}
            {activeGuideTab === "technical" && (
              <div className="space-y-6">
                <div className="border-l-4 border-error pl-4">
                  <h3 className="font-bold text-xl mb-4 text-error flex items-center">
                    ⚙️ Technical Features
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h4 className="card-title">🌳 AST Analysis</h4>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Real-time AST generation</li>
                          <li>Interactive tree view</li>
                          <li>Syntax validation</li>
                          <li>Educational value for parsing concepts</li>
                        </ul>
                        <div className="card-actions justify-end">
                          <div className="badge badge-accent">ANTLR4</div>
                        </div>
                      </div>
                    </div>

                    <div className="card bg-base-200">
                      <div className="card-body">
                        <h4 className="card-title">💾 Data Management</h4>
                        <ul className="list-disc pl-6 space-y-1 text-sm">
                          <li>Local storage persistence</li>
                          <li>No server required</li>
                          <li>Offline functionality</li>
                          <li>Automatic data validation</li>
                        </ul>
                        <div className="card-actions justify-end">
                          <div className="badge badge-success">
                            Offline Ready
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="stats shadow w-full mt-6">
                    <div className="stat">
                      <div className="stat-figure text-primary">
                        <FaCheckCircle size={24} />
                      </div>
                      <div className="stat-title">Parser</div>
                      <div className="stat-value text-primary">ANTLR4</div>
                      <div className="stat-desc">
                        Professional-grade C parser
                      </div>
                    </div>

                    <div className="stat">
                      <div className="stat-figure text-secondary">🌐</div>
                      <div className="stat-title">Cross-platform</div>
                      <div className="stat-value text-secondary">100%</div>
                      <div className="stat-desc">
                        Works on all modern browsers
                      </div>
                    </div>

                    <div className="stat">
                      <div className="stat-figure text-accent">⚡</div>
                      <div className="stat-title">Performance</div>
                      <div className="stat-value text-accent">Fast</div>
                      <div className="stat-desc">
                        Efficient memory management
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-bold mb-3">🚀 Perfect For</h4>
                    <div className="flex flex-wrap gap-2">
                      <div className="badge badge-primary">
                        Learning C Programming
                      </div>
                      <div className="badge badge-secondary">
                        Rapid Prototyping
                      </div>
                      <div className="badge badge-accent">
                        Coding Interviews
                      </div>
                      <div className="badge badge-neutral">
                        Educational Demos
                      </div>
                      <div className="badge badge-info">
                        Lightweight Development
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
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
