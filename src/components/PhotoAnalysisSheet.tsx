import { useState } from "react";
import { analyzePhotos, type AiAnalysisResult, type AiPiece } from "../lib/ai";
import { rectPoints, trapezoidPoints } from "../lib/geometry";
import { useStore } from "../store/projects";

export default function PhotoAnalysisSheet({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const addPiece = useStore((s) => s.addPiece);

  const run = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await analyzePhotos(files, hint || undefined);
      setResult(res);
      const sel: Record<number, boolean> = {};
      res.pieces.forEach((_, i) => (sel[i] = true));
      setSelected(sel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const place = () => {
    if (!result) return;
    const targetMax = 500; // mm reference for largest dim
    let col = 0;
    let row = 0;
    let rowMaxH = 0;
    let curX = 40;
    let curY = 40;
    const wrap = 1200;
    result.pieces.forEach((piece, i) => {
      if (!selected[i]) return;
      const w = piece.proportionalWidth * targetMax;
      const h = piece.proportionalHeight * targetMax;
      const pts =
        piece.shape === "trapezoid"
          ? trapezoidPoints(w * 0.7, w, h)
          : rectPoints(w, h);
      if (curX + w > wrap) {
        curX = 40;
        curY += rowMaxH + 30;
        rowMaxH = 0;
        row++;
        col = 0;
      }
      addPiece(projectId, {
        name: piece.name,
        points: pts,
        position: { x: curX, y: curY },
        aiGenerated: true,
        confidence: piece.confidence,
      });
      curX += w + 30;
      rowMaxH = Math.max(rowMaxH, h);
      col++;
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[color:var(--color-surface-solid)] rounded-3xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="ai-grad rounded-xl w-9 h-9 flex items-center justify-center text-lg">
              ✦
            </div>
            <div>
              <h2 className="text-xl">Analyse photo</h2>
              <div className="text-xs text-[color:var(--color-ink-3)]">
                Upload 1–4 photos. Claude vision will identify the structural
                fabric panels and add them as starting pieces.
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <div className="label mb-1">Photos (up to 4)</div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []).slice(0, 4);
                  setFiles(list);
                  setResult(null);
                }}
                className="text-sm"
              />
              {files.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {files.map((f, i) => (
                    <img
                      key={i}
                      src={URL.createObjectURL(f)}
                      className="rounded-xl aspect-square object-cover"
                      alt=""
                    />
                  ))}
                </div>
              )}
            </label>

            <label className="block">
              <div className="label mb-1">Hint (optional)</div>
              <input
                className="field"
                placeholder="e.g. front view; Nalgene bottle for scale"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
              />
            </label>

            {error && (
              <div className="text-sm rounded-xl bg-[color:var(--color-bad)]/10 text-[color:var(--color-bad)] px-3 py-2">
                {error}
              </div>
            )}

            {result && (
              <div className="rounded-2xl bg-black/[0.03] p-3">
                <div className="label mb-2">
                  Detected pieces · {result.bagType}
                </div>
                <div className="flex flex-col gap-2">
                  {result.pieces.map((p: AiPiece, i: number) => (
                    <label
                      key={i}
                      className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/60"
                    >
                      <input
                        type="checkbox"
                        checked={selected[i] ?? true}
                        onChange={(e) =>
                          setSelected({ ...selected, [i]: e.target.checked })
                        }
                      />
                      <span className="flex-1">{p.name}</span>
                      <span className="mono text-xs text-[color:var(--color-ink-3)]">
                        {Math.round(p.confidence * 100)}%
                      </span>
                      <span
                        className="w-1.5 h-6 rounded-full"
                        style={{
                          background:
                            p.confidence > 0.8
                              ? "var(--color-ok)"
                              : p.confidence > 0.5
                              ? "var(--color-warn)"
                              : "var(--color-bad)",
                        }}
                      />
                    </label>
                  ))}
                </div>
                {result.uncertainties.length > 0 && (
                  <div className="mt-3 text-xs text-[color:var(--color-ink-3)]">
                    <div className="label mb-1">Uncertainties</div>
                    <ul className="list-disc list-inside">
                      {result.uncertainties.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              {result ? (
                <button className="btn btn-primary" onClick={place}>
                  Place on canvas
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={run}
                  disabled={busy || files.length === 0}
                >
                  {busy ? "Analysing…" : "Analyse"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
