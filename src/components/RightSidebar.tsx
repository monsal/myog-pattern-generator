import type { PatternPiece, Project } from "../types";
import { polygonBounds, rectPoints } from "../lib/geometry";
import { edgeStatus } from "../lib/seams";
import { useStore, uid } from "../store/projects";

export default function RightSidebar({
  project,
  piece,
  selectedSeamId,
  onSelectSeam,
  onSelectPiece,
}: {
  project: Project;
  piece: PatternPiece | null;
  selectedSeamId?: string | null;
  onSelectSeam?: (id: string | null) => void;
  onSelectPiece?: (id: string | null) => void;
}) {
  const updatePiece = useStore((s) => s.updatePiece);
  const removeSeam = useStore((s) => s.removeSeam);
  const duplicatePiece = useStore((s) => s.duplicatePiece);
  const mirrorPiece = useStore((s) => s.mirrorPiece);

  if (!piece) {
    return (
      <aside className="hidden md:block w-[220px] lg:w-[256px] shrink-0 h-full p-3 z-10">
        <div className="glass rounded-2xl p-6 text-sm text-[color:var(--color-ink-3)] text-center">
          Select a pattern piece to edit its properties.
        </div>
      </aside>
    );
  }

  const b = polygonBounds(piece.points);
  const mat = project.materials.find((m) => m.id === piece.materialId);

  const setDims = (w?: number, h?: number) => {
    const newW = Math.max(20, w ?? b.w);
    const newH = Math.max(20, h ?? b.h);
    updatePiece(project.id, piece.id, (p) => {
      p.points = rectPoints(newW, newH);
    });
  };

  const hasGrain = piece.markings.some((m) => m.kind === "grain");
  const hasNotch = piece.markings.some((m) => m.kind === "notch");

  return (
    <aside className="hidden md:block w-[220px] lg:w-[256px] shrink-0 h-full p-3 overflow-y-auto z-10">
      <div className="glass rounded-2xl p-4 flex flex-col gap-4">
        <div>
          <label className="label">Name</label>
          <input
            className="field mt-1"
            value={piece.name}
            onChange={(e) =>
              updatePiece(project.id, piece.id, (p) => {
                p.name = e.target.value;
              })
            }
          />
          {piece.aiGenerated && (
            <div className="mt-2 text-[11px] ai-grad rounded-xl px-2 py-1 inline-block">
              AI ✦ verify real dimensions
            </div>
          )}
          <div className="flex gap-1 mt-3">
            <button
              className="btn btn-ghost !py-1 !px-2 text-xs"
              title="Duplicate (offset 40mm)"
              onClick={() => {
                const id = duplicatePiece(project.id, piece.id);
                if (id && onSelectPiece) onSelectPiece(id);
              }}
            >
              ⧉ Duplicate
            </button>
            <button
              className="btn btn-ghost !py-1 !px-2 text-xs"
              title="Mirror horizontally"
              onClick={() => mirrorPiece(project.id, piece.id, "x")}
            >
              ⇋ Mirror H
            </button>
            <button
              className="btn btn-ghost !py-1 !px-2 text-xs"
              title="Mirror vertically"
              onClick={() => mirrorPiece(project.id, piece.id, "y")}
            >
              ⥯ Mirror V
            </button>
          </div>
        </div>

        <div>
          <label className="label">Dimensions (mm)</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Field
              label="W"
              value={b.w.toFixed(0)}
              onCommit={(v) => setDims(parseFloat(v), undefined)}
            />
            <Field
              label="H"
              value={b.h.toFixed(0)}
              onCommit={(v) => setDims(undefined, parseFloat(v))}
            />
          </div>
        </div>

        <div>
          <label className="label">Quantity</label>
          <input
            type="number"
            min={1}
            className="field mt-1"
            value={piece.cutQuantity}
            onChange={(e) =>
              updatePiece(project.id, piece.id, (p) => {
                p.cutQuantity = Math.max(1, parseInt(e.target.value || "1", 10));
              })
            }
          />
        </div>

        <div>
          <label className="label">Seam allowance (mm)</label>
          <input
            type="number"
            min={0}
            step={1}
            className="field mt-1"
            value={piece.seamAllowance}
            onChange={(e) =>
              updatePiece(project.id, piece.id, (p) => {
                p.seamAllowance = Math.max(0, parseFloat(e.target.value || "0"));
              })
            }
          />
        </div>

        <div>
          <label className="label">Material</label>
          <select
            className="field mt-1"
            value={piece.materialId ?? ""}
            onChange={(e) =>
              updatePiece(project.id, piece.id, (p) => {
                p.materialId = e.target.value;
              })
            }
          >
            {project.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.weight} g/m²
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="w-4 h-4 rounded-md"
              style={{ background: mat?.color ?? "#888" }}
            />
            <span className="text-xs text-[color:var(--color-ink-2)]">{mat?.name}</span>
          </div>
        </div>

        <div>
          <label className="label">Markings</label>
          <div className="flex gap-2 mt-2">
            <Chip
              active={hasGrain}
              onClick={() =>
                updatePiece(project.id, piece.id, (p) => {
                  if (hasGrain) p.markings = p.markings.filter((m) => m.kind !== "grain");
                  else
                    p.markings.push({
                      id: uid("mk"),
                      kind: "grain",
                      angle: 0,
                      position: { x: b.w / 2, y: b.h / 2 },
                    });
                })
              }
            >
              ↥ Grain
            </Chip>
            <Chip
              active={hasNotch}
              onClick={() =>
                updatePiece(project.id, piece.id, (p) => {
                  if (hasNotch) p.markings = p.markings.filter((m) => m.kind !== "notch");
                  else
                    p.markings.push({
                      id: uid("mk"),
                      kind: "notch",
                      position: { x: b.w / 2, y: 0 },
                    });
                })
              }
            >
              ✕ Notch
            </Chip>
          </div>
        </div>

        <div>
          <label className="label">Edges · seam allowance & connections</label>
          <div className="text-[10px] text-[color:var(--color-ink-3)] mb-1">
            SA defaults to the piece value; override per edge if needed.
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            {piece.points.map((_, i) => {
              const info = edgeStatus(project, piece.id, i);
              const target = info.connectedTo
                ? project.pieces.find((p) => p.id === info.connectedTo!.pieceId)
                : null;
              const color =
                info.status === "ok"
                  ? "var(--color-ok)"
                  : info.status === "warn"
                  ? "var(--color-warn)"
                  : info.status === "bad"
                  ? "var(--color-bad)"
                  : "var(--color-ink-3)";
              const seam = project.seams.find(
                (s) =>
                  (s.fromPieceId === piece.id && s.fromEdge === i) ||
                  (s.toPieceId === piece.id && s.toEdge === i)
              );
              const isSelectedSeam = seam && seam.id === selectedSeamId;
              const edgeSa = piece.edgeSeamAllowances?.[i];
              return (
                <div
                  key={i}
                  className={`rounded-lg px-2 py-1 text-[12px] spring ${
                    isSelectedSeam
                      ? "bg-[color:var(--color-accent-soft)] ring-1 ring-[color:var(--color-accent)]"
                      : "bg-black/[0.02] hover:bg-black/[0.04]"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      seam ? "cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (seam && onSelectSeam) {
                        onSelectSeam(isSelectedSeam ? null : seam.id);
                      }
                    }}
                  >
                    <span className="mono text-[10px] text-[color:var(--color-ink-3)] w-7">
                      e{i}
                    </span>
                    <span className="mono text-[11px]">
                      {info.length.toFixed(0)}
                    </span>
                    <span className="flex-1 truncate text-[color:var(--color-ink-2)]">
                      {target ? `→ ${target.name} e${info.connectedTo?.edge}` : "—"}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: color }}
                      title={
                        info.delta !== undefined
                          ? `Δ ${info.delta.toFixed(1)}mm`
                          : "unconnected"
                      }
                    />
                    {target && (
                      <button
                        className="text-[color:var(--color-ink-3)] hover:text-[color:var(--color-bad)] text-xs px-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (seam) removeSeam(project.id, seam.id);
                        }}
                        title="Remove connection"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 pl-7">
                    <span className="text-[10px] text-[color:var(--color-ink-3)]">
                      SA
                    </span>
                    <input
                      type="number"
                      className="field !py-0.5 !px-1.5 !text-[11px] w-14"
                      placeholder={String(piece.seamAllowance)}
                      value={edgeSa ?? ""}
                      onChange={(e) =>
                        updatePiece(project.id, piece.id, (p) => {
                          const v = e.target.value;
                          if (!p.edgeSeamAllowances) p.edgeSeamAllowances = {};
                          if (v === "") delete p.edgeSeamAllowances[i];
                          else p.edgeSeamAllowances[i] = parseFloat(v);
                        })
                      }
                    />
                    <span className="text-[10px] text-[color:var(--color-ink-3)]">
                      mm
                    </span>
                    {edgeSa !== undefined && (
                      <button
                        className="text-[10px] text-[color:var(--color-ink-3)] hover:text-[color:var(--color-accent)]"
                        onClick={() =>
                          updatePiece(project.id, piece.id, (p) => {
                            if (p.edgeSeamAllowances) delete p.edgeSeamAllowances[i];
                          })
                        }
                        title="Reset to piece default"
                      >
                        reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="label">{label}</span>
      <input
        className="field"
        defaultValue={value}
        key={value}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`spring rounded-xl px-3 py-1.5 text-xs font-semibold display ${
        active
          ? "bg-[color:var(--color-accent)] text-white"
          : "bg-black/[0.04] text-[color:var(--color-ink-2)] hover:bg-black/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}
