import { useState } from "react";
import Editor from "@monaco-editor/react";

function App() {
  const [files, setFiles] = useState([]); // 儲存多個檔案 [{name, content}]
  const [activeIndex, setActiveIndex] = useState(0); // 當前使用中的檔案索引

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".c")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setFiles((prev) => [...prev, { name: file.name, content }]);
        setActiveIndex(files.length); // 設定新檔案為當前編輯中
      };
      reader.readAsText(file);
    } else {
      alert("請上傳 .c 檔案！");
    }
  };

  const updateContent = (newValue) => {
    const updated = [...files];
    updated[activeIndex].content = newValue;
    setFiles(updated);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 🔹 上方標題區 */}
      <header className="bg-blue-800 text-white text-xl font-bold p-4">
        簡單的 C 編輯器
      </header>

      {/* 🔹 主體：左右區塊 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 📝 編輯器區塊 */}
        <div className="w-2/3 border-r border-gray-300">
          <Editor
            height="100%"
            language="c"
            value={files[activeIndex]?.content || ""}
            theme="vs-dark"
            onChange={(value) => updateContent(value || "")}
            options={{
              fontSize: 18,
              minimap: { enabled: false },
              wordWrap: "on",
            }}
          />
        </div>

        {/* 📂 右側區塊：上傳按鈕 + Tabs */}
        <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
          <div className="mb-4">
            <label className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600">
              上傳 C 檔案
              <input
                type="file"
                accept=".c"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* 🔖 檔案 Tabs */}
          <div className="space-y-2">
            {files.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`block w-full text-left px-4 py-2 rounded ${
                  idx === activeIndex
                    ? "bg-blue-600 text-white"
                    : "bg-white hover:bg-blue-100"
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
