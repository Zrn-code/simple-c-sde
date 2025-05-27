import { FaSitemap, FaFolder, FaEdit, FaCheckCircle } from "react-icons/fa";

const SiteGuideModal = ({ activeGuideTab, setActiveGuideTab }) => {
  return (
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

        {/* Tab Content */}
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
                      <h4 className="card-title text-lg">Project Templates</h4>
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
                  <input type="radio" name="project-accordion" defaultChecked />
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
                      <kbd className="kbd kbd-xs">Tab</kbd> for quick templates
                    </li>
                    <li>
                      Use <kbd className="kbd kbd-xs">Ctrl</kbd>+
                      <kbd className="kbd kbd-xs">S</kbd> frequently to backup
                      important files
                    </li>
                    <li>The AST viewer updates in real-time as you type</li>
                    <li>Right-click in the editor for context menu options</li>
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
                        <div className="badge badge-success">Offline Ready</div>
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
                    <div className="stat-desc">Professional-grade C parser</div>
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
                    <div className="stat-desc">Efficient memory management</div>
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
                    <div className="badge badge-accent">Coding Interviews</div>
                    <div className="badge badge-neutral">Educational Demos</div>
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
  );
};

export default SiteGuideModal;
