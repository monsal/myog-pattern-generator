import { Link, useParams } from "react-router-dom";
import { useStore } from "../store/projects";
import { downloadProjectPdf } from "../lib/pdf";
import { offsetPolygon, polygonBounds } from "../lib/geometry";
import { PAPER_MM } from "../lib/units";
import { useState } from "react";

export default function Print() {
  const { id } = useParams();
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const updateProject = useStore((s) => s.updateProject);
  const [busy, setBusy] = useState(false);

  if (!project) return null;

  const paper = PAPER_MM[project.print.paper];
  const portrait = project.print.orientation === "portrait";
  const W = portrait ? paper.w : paper.h;
  const H = portrait ? paper.h : paper.w;
  const margin = 8;
  const overlap = project.print.overlapMm;

  const pageBreakdown = project.pieces.map((piece) => {
    const outer = offsetPolygon(piece.points, piece.seamAllowance);
    const b = polygonBounds([...piece.points, ...outer]);
    const usableW = W - 2 * margin - overlap;
    const usableH = H - 2 * margin - overlap;
    const cols = Math.max(1, Math.ceil((b.w - overlap) / usableW));
    const rows = Math.max(1, Math.ceil((b.h - overlap) / usableH));
    return { piece, cols, rows, pages: cols * rows };
  });
  const total = pageBreakdown.reduce((a, b) => a + b.pages, 0);

  return (
    <div className="min-h-screen">
      <header className="h-14 px-4 flex items-center gap-3 border-b border-black/[0.07] bg-white/60 backdrop-blur">
        <Link to={`/projects/${project.id}`} className="icon-btn">
          ‹
        </Link>
        <div className="display font-extrabold">{project.name} · Print</div>
        <div className="flex-1" />
        <button
          className="btn btn-primary"
          disabled={busy || project.pieces.length === 0}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadProjectPdf(project);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Generating…" : "Download PDF"}
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        <div className="glass rounded-2xl p-5 mb-6 grid grid-cols-3 gap-4">
          <div>
            <div className="label">Paper</div>
            <select
              className="field mt-1"
              value={project.print.paper}
              onChange={(e) =>
                updateProject(project.id, (p) => {
                  p.print.paper = e.target.value as "A4" | "A3";
                })
              }
            >
              <option>A4</option>
              <option>A3</option>
            </select>
          </div>
          <div>
            <div className="label">Orientation</div>
            <select
              className="field mt-1"
              value={project.print.orientation}
              onChange={(e) =>
                updateProject(project.id, (p) => {
                  p.print.orientation = e.target.value as "portrait" | "landscape";
                })
              }
            >
              <option value="portrait">portrait</option>
              <option value="landscape">landscape</option>
            </select>
          </div>
          <div>
            <div className="label">Tile overlap (mm)</div>
            <input
              type="number"
              className="field mt-1"
              value={project.print.overlapMm}
              onChange={(e) =>
                updateProject(project.id, (p) => {
                  p.print.overlapMm = Math.max(
                    0,
                    parseFloat(e.target.value || "0")
                  );
                })
              }
            />
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="display font-bold">Page breakdown</div>
            <div className="mono text-sm text-[color:var(--color-ink-2)]">
              total <span className="text-[color:var(--color-accent)] font-semibold">{total}</span> pages
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {pageBreakdown.map(({ piece, cols, rows, pages }) => (
              <li
                key={piece.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-black/[0.03]"
              >
                <div className="display font-bold flex-1">{piece.name}</div>
                <div className="mono text-xs text-[color:var(--color-ink-2)]">
                  {cols}×{rows} tiles
                </div>
                <div className="mono text-sm">{pages} pages</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-xs text-[color:var(--color-ink-3)]">
            Each piece includes crop marks, alignment crosshairs, dashed seam
            allowance, and a 50mm calibration square on its first page. Print at
            100% scale (no “fit to page”).
          </div>
        </div>
      </main>
    </div>
  );
}
