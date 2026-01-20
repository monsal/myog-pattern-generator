interface HeaderProps {
  onNewProject: () => void;
}

export default function Header({ onNewProject }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg"></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">MYOG Pattern Generator</h1>
            <p className="text-sm text-gray-500">AI-powered sewing patterns</p>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          <button
            onClick={onNewProject}
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
          >
            New Project
          </button>
          <a
            href="https://github.com/monsal/myog-pattern-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
