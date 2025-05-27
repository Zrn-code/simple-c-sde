import { FaFolderPlus } from "react-icons/fa";
import { projectTemplates } from "../data/projectTemplates";

const NewProjectModal = ({ createProjectFromTemplate }) => {
  return (
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
  );
};

export default NewProjectModal;
