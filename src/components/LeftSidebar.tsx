import type { Project } from "../types";
import { projectSeamSummary } from "../lib/seams";
import { pieceBounds } from "../lib/geometry";
import { PAPER_MM } from "../lib/units";
import { offsetPolygon, polygonBounds } from "../lib/geometry";

export default function LeftSidebar({
  project,
  selectedPieceId,
  onSelect,
  onRemovePiece,
}: {
  project: Project;
  selectedPieceId: string | null;
  onSelect: (id: string) => void;
  onRemovePiece: (id: string) => void;
}) {
  const summary = projectSeamSummary(project);
  const paper = PAPER_MM[project.print.paper];
  const portrait = project.print.orientation === "portrait";
  const paperW = portrait ? paper.w : paper.h;
  const paperH = portrait ? paper.h : paper.w;
  const overlap = project.print.overlapMm;
  const margin = 8;
  const usableW = paperW - 2 * margin - overlap;
  const usableH = paperH - 2 * margin - overlap;
  let pageCount = 0;
  for (const piece of project.pieces) {
    const outer = offsetPolygon(piece.points, piece.seamAllowance);
    const b = polygonBounds([...piece.points, ...outer]);
    const cols = Math.max(1, Math.ceil((b.w - overlap) / usableW));
    const rows = Math.max(1, Math.ceil((b.h - overlap) / usableH));
    pageCount += cols * rows;
  }

  return (
    <aside className="w-[220px] shrink-0 h-full p-3 flex flex-col gap-3 z-10">
      <div className="glass rounded-2xl p-3">
        <div className="label mb-2">Pieces</div>
        <div className="flex flex-col gap-1">
          {project.pieces.length === 0 && (
            <div className="text-xs text-[color:var(--color-ink-3)]">
              No pieces yet. Use the toolbar to add one.
            </div>
          )}
          {project.pieces.map((p) => {
            const mat = project.materials.find((m) => m.id === p.materialId);
            const b = pieceBounds(p);
            const sel = p.id === selectedPieceId;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`spring text-left rounded-xl p-2 flex items-center gap-2 ${
                  sel ? "bg-[color:var(--color-accent-soft)]" : "hover:bg-black/[0.04]"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: mat?.color ?? "#999" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate display">
                    {p.name}
                  </div>
                  <div className="mono text-[10px] text-[color:var(--color-ink-3)] truncate">
                    {b.w.toFixed(0)}×{b.h.toFixed(0)} mm · cut {p.cutQuantity}
                  </div>
                </div>
                <span
                  className="text-[color:var(--color-ink-3)] hover:text-[color:var(--color-bad)] text-xs px-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePiece(p.id);
                  }}
                >
                  ×
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-3">
        <div className="label mb-2">Seam validation</div>
        <div className="flex flex-col gap-1.5 text-[13px]">
          <Row label="Matched" count={summary.ok} color="var(--color-ok)" />
          <Row label="Mismatch (small)" count={summary.warn} color="var(--color-warn)" />
          <Row label="Mismatch (large)" count={summary.bad} color="var(--color-bad)" />
          <Row label="Unconnected edges" count={summary.unconnected} color="var(--color-ink-3)" />
        </div>
      </div>

      <div className="glass rounded-2xl p-3">
        <div className="label mb-1">Print</div>
        <div className="text-sm mono text-[color:var(--color-ink-2)]">
          {project.print.paper} {project.print.orientation}
        </div>
        <div className="mt-1 text-xs text-[color:var(--color-ink-3)]">
          ≈ <span className="mono">{pageCount}</span> pages with {overlap}mm overlap
        </div>
      </div>
    </aside>
  );
}

function Row({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[color:var(--color-ink-2)]">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <span className="mono">{count}</span>
    </div>
  );
}
