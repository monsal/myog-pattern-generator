import type { GeneratedPattern } from '../types/pattern';

interface SidebarProps {
  currentPattern: GeneratedPattern | null;
  onNewProject: () => void;
}

export default function Sidebar({ currentPattern, onNewProject }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <button
        onClick={onNewProject}
        className="w-full px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors mb-6"
      >
        + New Pattern
      </button>

      {currentPattern && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Project</h3>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{currentPattern.projectInfo.name}</p>
              <p className="text-sm text-gray-600 mt-1">{currentPattern.pieces.length} pieces</p>
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                {currentPattern.projectInfo.difficulty}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Quick Info
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Est. Time:</span>
                <span className="font-medium text-gray-900">{currentPattern.projectInfo.estimatedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pieces:</span>
                <span className="font-medium text-gray-900">{currentPattern.pieces.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hardware:</span>
                <span className="font-medium text-gray-900">{currentPattern.hardware.length} items</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!currentPattern && (
        <div className="text-center py-8 text-gray-400 text-sm">
          <p>No pattern loaded</p>
          <p className="mt-1">Create a new pattern to get started</p>
        </div>
      )}
    </aside>
  );
}
