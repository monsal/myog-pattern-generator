import { useState } from 'react';
import type { PatternRequest, ProjectType } from '../types/pattern';
import ProjectTypeSelector from './ProjectTypeSelector';

interface InputFormProps {
  onGenerate: (request: PatternRequest) => void;
  error: string | null;
}

const exampleDescriptions = [
  'Small toiletry pouch, 20cm x 15cm x 10cm, with YKK zipper and mesh pocket inside',
  'Cylindrical stuff sack, 30cm tall, 15cm diameter, with drawstring closure',
  '20L daypack with laptop sleeve, water bottle pockets, and sternum strap',
  'Minimalist hip pack, 25cm x 15cm, single compartment with YKK zipper',
];

export default function InputForm({ onGenerate, error }: InputFormProps) {
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('pouch');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [measurements, setMeasurements] = useState({
    height: '',
    width: '',
    depth: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const request: PatternRequest = {
      description,
      projectType,
    };

    // Add measurements if provided
    if (measurements.height || measurements.width || measurements.depth) {
      request.measurements = {
        height: measurements.height ? parseFloat(measurements.height) : undefined,
        width: measurements.width ? parseFloat(measurements.width) : undefined,
        depth: measurements.depth ? parseFloat(measurements.depth) : undefined,
      };
    }

    onGenerate(request);
  };

  const isValid = description.trim().length >= 10;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Describe Your Project
        </h2>
        <p className="text-gray-600">
          Tell us what you want to make. Be specific about size, features, and materials.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Project Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Project Type
        </label>
        <ProjectTypeSelector
          selected={projectType}
          onChange={setProjectType}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="Example: Small toiletry pouch, 20cm x 15cm x 10cm, with YKK zipper and mesh pocket inside"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-gray-500">
            {description.length} characters {description.length < 50 && '(suggest 50-300 for best results)'}
          </p>
        </div>
      </div>

      {/* Example descriptions */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Need inspiration? Try these:</p>
        <div className="space-y-2">
          {exampleDescriptions.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setDescription(example)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="30"
                  value={measurements.height}
                  onChange={(e) => setMeasurements({ ...measurements, height: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                  Width (cm)
                </label>
                <input
                  type="number"
                  id="width"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="20"
                  value={measurements.width}
                  onChange={(e) => setMeasurements({ ...measurements, width: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="depth" className="block text-sm font-medium text-gray-700 mb-1">
                  Depth (cm)
                </label>
                <input
                  type="number"
                  id="depth"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="10"
                  value={measurements.depth}
                  onChange={(e) => setMeasurements({ ...measurements, depth: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Optional: Provide specific measurements to override AI estimates
            </p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid}
        className={`w-full px-6 py-4 text-lg font-semibold rounded-lg transition-colors ${
          isValid
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Generate Pattern
      </button>
    </form>
  );
}
