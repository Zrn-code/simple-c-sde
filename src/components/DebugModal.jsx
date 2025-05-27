import { FaBug } from "react-icons/fa";

const DebugModal = ({ handleSave, handleLoad }) => {
  return (
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
              {localStorage.getItem("myProjects") || "No data in localStorage."}
            </pre>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>Close</button>
      </form>
    </dialog>
  );
};

export default DebugModal;
