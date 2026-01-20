import type { ProjectType } from '../types/pattern';

interface ProjectTypeSelectorProps {
  selected: ProjectType;
  onChange: (type: ProjectType) => void;
}

const projectTypes: { value: ProjectType; label: string; icon: string }[] = [
  { value: 'backpack', label: 'Backpack', icon: '🎒' },
  { value: 'pouch', label: 'Pouch', icon: '👝' },
  { value: 'bag', label: 'Bag', icon: '👜' },
  { value: 'stuff-sack', label: 'Stuff Sack', icon: '🎲' },
  { value: 'other', label: 'Other', icon: '✨' },
];

export default function ProjectTypeSelector({ selected, onChange }: ProjectTypeSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {projectTypes.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={`p-4 rounded-lg border-2 transition-all ${
            selected === type.value
              ? 'border-primary-500 bg-primary-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="text-3xl mb-2">{type.icon}</div>
          <div className={`text-sm font-medium ${
            selected === type.value ? 'text-primary-700' : 'text-gray-700'
          }`}>
            {type.label}
          </div>
        </button>
      ))}
    </div>
  );
}
