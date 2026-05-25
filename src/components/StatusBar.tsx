import type { PatternPiece, Project } from "../types";
import { polygonArea, polygonBounds } from "../lib/geometry";
import { projectSeamSummary } from "../lib/seams";

export default function StatusBar({
  project,
  piece,
  savedAt,
}: {
  project: Project;
  piece: PatternPiece | null;
  savedAt: number | null;
}) {
  const totalArea = project.pieces.reduce(
    (acc, p) => acc + polygonArea(p.points) * p.cutQuantity,
    0
  );
  const summary = projectSeamSummary(project);
  const b = piece ? polygonBounds(piece.points) : null;
  const area = piece ? polygonArea(piece.points) : 0;
  return (
    <div className="h-9 border-t border-black/[0.07] bg-white/60 backdrop-blur flex items-center gap-4 px-4 text-[11px] mono text-[color:var(--color-ink-2)]">
      {piece && b ? (
        <>
          <span className="display font-semibold not-italic text-[color:var(--color-ink-1)]">
            {piece.name}
          </span>
          <span>{b.w.toFixed(0)}×{b.h.toFixed(0)} mm</span>
          <span>{(area / 1000).toFixed(1)} cm²</span>
        </>
      ) : (
        <span className="display font-semibold text-[color:var(--color-ink-3)]">
          No selection
        </span>
      )}
      <span className="flex-1" />
      <span>{project.pieces.length} pieces</span>
      <span>{(totalArea / 1_000_000).toFixed(2)} m² fabric</span>
      {summary.warn + summary.bad > 0 && (
        <span className="text-[color:var(--color-warn)]">
          ⚠ {summary.warn + summary.bad} seam mismatch
          {summary.warn + summary.bad === 1 ? "" : "es"}
        </span>
      )}
      {savedAt && (
        <span className="text-[color:var(--color-ink-3)]">
          saved {formatRel(savedAt)}
        </span>
      )}
    </div>
  );
}

function formatRel(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return new Date(ts).toLocaleTimeString();
}
