import { useRef, useEffect, useState } from 'react';
import type { GeneratedPattern, PatternPiece } from '../types/pattern';

interface PatternCanvasProps {
  pattern: GeneratedPattern;
}

export default function PatternCanvas({ pattern }: PatternCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPiece, setSelectedPiece] = useState<PatternPiece | null>(null);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Simple grid background
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw pattern pieces
    let offsetX = 50;
    let offsetY = 50;
    const pixelsPerCm = 3 * scale; // 3 pixels = 1cm at 100% scale

    pattern.pieces.forEach((piece) => {
      ctx.save();

      // Draw piece based on shape
      if (piece.shape === 'rectangle' && piece.dimensions.width && piece.dimensions.height) {
        const width = piece.dimensions.width * pixelsPerCm;
        const height = piece.dimensions.height * pixelsPerCm;

        // Draw rectangle
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.fillRect(offsetX, offsetY, width, height);
        ctx.strokeRect(offsetX, offsetY, width, height);

        // Draw seam allowance
        const sa = piece.seamAllowance * pixelsPerCm;
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(offsetX + sa, offsetY + sa, width - sa * 2, height - sa * 2);
        ctx.setLineDash([]);

        // Draw label
        ctx.fillStyle = '#0c4a6e';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(piece.name, offsetX + 10, offsetY + 25);
        ctx.font = '12px sans-serif';
        ctx.fillText(
          `${piece.dimensions.width}cm × ${piece.dimensions.height}cm`,
          offsetX + 10,
          offsetY + 45
        );
        ctx.fillText(`Cut ${piece.cutQuantity}×`, offsetX + 10, offsetY + 65);

        offsetX += width + 40;
        if (offsetX > canvas.width - 200) {
          offsetX = 50;
          offsetY += height + 40;
        }
      } else if (piece.shape === 'circle' && piece.dimensions.radius) {
        const radius = piece.dimensions.radius * pixelsPerCm;

        // Draw circle
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(offsetX + radius, offsetY + radius, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw label
        ctx.fillStyle = '#0c4a6e';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(piece.name, offsetX + radius - 40, offsetY + radius - 10);
        ctx.font = '12px sans-serif';
        ctx.fillText(
          `Ø ${piece.dimensions.radius * 2}cm`,
          offsetX + radius - 30,
          offsetY + radius + 10
        );

        offsetX += radius * 2 + 40;
        if (offsetX > canvas.width - 200) {
          offsetX = 50;
          offsetY += radius * 2 + 40;
        }
      }

      ctx.restore();
    });
  }, [pattern, scale]);

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {pattern.projectInfo.name}
          </h2>
          <span className="px-3 py-1 text-sm font-medium bg-primary-100 text-primary-700 rounded-full">
            {pattern.pieces.length} pieces
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Scale:</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-600 w-12">{Math.round(scale * 100)}%</span>
          </div>

          <button
            onClick={() => alert('PDF export coming soon!')}
            className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <canvas
            ref={canvasRef}
            className="w-full h-full bg-white border border-gray-200 rounded-lg shadow-sm"
          />
        </div>

        {/* Info Panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pattern Details</h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Materials</h4>
              <ul className="space-y-2 text-sm">
                {pattern.materials.fabric.map((fabric, index) => (
                  <li key={index} className="flex justify-between">
                    <span className="text-gray-600">{fabric.type}</span>
                    <span className="font-medium text-gray-900">{fabric.amount}m</span>
                  </li>
                ))}
                <li className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Thread</span>
                  <span className="font-medium text-gray-900">{pattern.materials.thread}</span>
                </li>
              </ul>
            </div>

            {pattern.hardware.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Hardware</h4>
                <ul className="space-y-2 text-sm">
                  {pattern.hardware.map((item, index) => (
                    <li key={index} className="text-gray-600">
                      {item.quantity}× {item.item} {item.length && `(${item.length})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Project Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {pattern.projectInfo.difficulty}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. Time:</span>
                  <span className="font-medium text-gray-900">{pattern.projectInfo.estimatedTime}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Assembly Steps</h4>
              <ol className="space-y-2 text-sm list-decimal list-inside">
                {pattern.assembly.slice(0, 5).map((step) => (
                  <li key={step.step} className="text-gray-600">
                    {step.instruction.slice(0, 60)}
                    {step.instruction.length > 60 && '...'}
                  </li>
                ))}
                {pattern.assembly.length > 5 && (
                  <li className="text-primary-600 font-medium">
                    +{pattern.assembly.length - 5} more steps
                  </li>
                )}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
