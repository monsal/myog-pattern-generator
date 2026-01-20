import { useEffect, useState } from 'react';

const loadingSteps = [
  'Analyzing your request...',
  'Designing pattern pieces...',
  'Calculating dimensions...',
  'Adding seam allowances...',
  'Generating assembly instructions...',
  'Finalizing pattern...',
];

export default function GenerationLoader() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % loadingSteps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="relative">
        {/* Animated spinner */}
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
            />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Generating Your Pattern
        </h2>
        <p className="text-primary-600 font-medium animate-pulse">
          {loadingSteps[currentStep]}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          This may take 10-15 seconds
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {loadingSteps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentStep ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
