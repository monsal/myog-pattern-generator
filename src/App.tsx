import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import InputForm from './components/InputForm';
import GenerationLoader from './components/GenerationLoader';
import PatternCanvas from './components/PatternCanvas';
import type { PatternRequest, GeneratedPattern } from './types/pattern';
import { generatePattern } from './services/api-client';

type AppState = 'input' | 'generating' | 'preview';

function App() {
  const [appState, setAppState] = useState<AppState>('input');
  const [currentPattern, setCurrentPattern] = useState<GeneratedPattern | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePattern = async (request: PatternRequest) => {
    setAppState('generating');
    setError(null);

    try {
      const pattern = await generatePattern(request);
      setCurrentPattern(pattern);
      setAppState('preview');
    } catch (err) {
      console.error('Pattern generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate pattern');
      setAppState('input');
    }
  };

  const handleNewProject = () => {
    setCurrentPattern(null);
    setAppState('input');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onNewProject={handleNewProject} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentPattern={currentPattern}
          onNewProject={handleNewProject}
        />

        <main className="flex-1 overflow-auto p-6">
          {appState === 'input' && (
            <div className="max-w-4xl mx-auto">
              <InputForm
                onGenerate={handleGeneratePattern}
                error={error}
              />
            </div>
          )}

          {appState === 'generating' && (
            <div className="flex items-center justify-center h-full">
              <GenerationLoader />
            </div>
          )}

          {appState === 'preview' && currentPattern && (
            <PatternCanvas pattern={currentPattern} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
