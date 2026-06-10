import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../store/projects";
import Canvas from "../components/Canvas";
import Toolstrip, { type Tool } from "../components/Toolstrip";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import CanvasToolbar from "../components/CanvasToolbar";
import StatusBar from "../components/StatusBar";
import Preview3D from "../components/Preview3D";
import PhotoAnalysisSheet from "../components/PhotoAnalysisSheet";
import { downloadProjectPdf } from "../lib/pdf";
import { rectPoints } from "../lib/geometry";

export default function Editor() {
  const { id } = useParams();
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const updateProject = useStore((s) => s.updateProject);
  const addPiece = useStore((s) => s.addPiece);
  const removePiece = useStore((s) => s.removePiece);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedSeamId, setSelectedSeamId] = useState<string | null>(null);
  const [view, setView] = useState<"2d" | "3d" | "both">("both");
  const [showAi, setShowAi] = useState(false);
  const [exporting, setExporting] = useState(false);

  const piece = useMemo(
    () => project?.pieces.find((p) => p.id === selectedPieceId) ?? null,
    [project, selectedPieceId]
  );

  // Keyboard: Delete / Backspace removes the selected piece when not in a
  // text field, and number keys 1-9 jump to a tool.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inField) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedPieceId && project) {
        removePiece(project.id, selectedPieceId);
        setSelectedPieceId(null);
        e.preventDefault();
        return;
      }
      const shortcuts: Record<string, Tool> = {
        v: "select",
        p: "polygon",
        b: "pen",
        m: "measure",
        n: "notch",
        g: "grain",
        s: "seam",
        h: "pan",
      };
      const t = shortcuts[e.key.toLowerCase()];
      if (t) setTool(t);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, selectedPieceId, removePiece]);

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="display text-xl mb-2">Project not found</div>
          <Link to="/" className="btn btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadProjectPdf(project);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 px-4 flex items-center gap-3 border-b border-black/[0.07] bg-white/60 backdrop-blur z-10">
        <Link to="/" className="icon-btn" title="Dashboard">
          ‹
        </Link>
        <input
          className="display font-extrabold text-base bg-transparent outline-none flex-1"
          value={project.name}
          onChange={(e) =>
            updateProject(project.id, (p) => {
              p.name = e.target.value;
            })
          }
        />
        <button
          className="btn btn-ghost hidden sm:inline-flex"
          onClick={() => setShowAi(true)}
          title="Analyse photo"
        >
          <span className="ai-grad bg-clip-text text-transparent">✦ Analyse photo</span>
        </button>
        <button
          className="btn"
          onClick={() => {
            const id = addPiece(project.id, {
              points: rectPoints(180, 240),
            });
            setSelectedPieceId(id);
          }}
          title="Add rectangle piece (or use the polygon / pen tool to draw)"
        >
          + Add piece
        </button>
        <Link
          to={`/projects/${project.id}/instructions`}
          className="btn btn-ghost hidden lg:inline-flex"
        >
          Instructions
        </Link>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting || project.pieces.length === 0}
        >
          {exporting ? "Exporting…" : "Export PDF"}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden bg-[color:var(--color-canvas)]">
        <LeftSidebar
          project={project}
          selectedPieceId={selectedPieceId}
          onSelect={setSelectedPieceId}
          onRemovePiece={(pid) => {
            removePiece(project.id, pid);
            if (selectedPieceId === pid) setSelectedPieceId(null);
          }}
        />

        <div className="flex-1 flex relative overflow-hidden">
          <Toolstrip active={tool} onChange={setTool} />
          <CanvasToolbar project={project} view={view} onViewChange={setView} />

          {view !== "3d" && (
            <div className="flex-1 relative min-w-0">
              <Canvas
                project={project}
                tool={tool}
                selectedPieceId={selectedPieceId}
                onSelect={setSelectedPieceId}
              />
              {project.pieces.length === 0 && (
                <EmptyEditorHint
                  onDrawPolygon={() => setTool("polygon")}
                  onAddRectangle={() => {
                    const id = addPiece(project.id, { points: rectPoints(180, 240) });
                    setSelectedPieceId(id);
                  }}
                  onAnalysePhoto={() => setShowAi(true)}
                />
              )}
            </div>
          )}
          {view !== "2d" && (
            <div
              className={
                view === "3d"
                  ? "w-full h-full"
                  : "hidden lg:block h-full w-[34%] xl:w-[38%] min-w-[280px]"
              }
            >
              <Preview3D
                project={project}
                selectedPieceId={selectedPieceId}
                selectedSeamId={selectedSeamId}
                onSelectPiece={setSelectedPieceId}
                onSelectSeam={setSelectedSeamId}
              />
            </div>
          )}
        </div>

        <RightSidebar
          project={project}
          piece={piece}
          selectedSeamId={selectedSeamId}
          onSelectSeam={setSelectedSeamId}
          onSelectPiece={setSelectedPieceId}
        />
      </div>

      <StatusBar project={project} piece={piece} savedAt={project.updatedAt} />

      {showAi && (
        <PhotoAnalysisSheet projectId={project.id} onClose={() => setShowAi(false)} />
      )}
    </div>
  );
}

function EmptyEditorHint({
  onDrawPolygon,
  onAddRectangle,
  onAnalysePhoto,
}: {
  onDrawPolygon: () => void;
  onAddRectangle: () => void;
  onAnalysePhoto: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="glass rounded-3xl p-7 max-w-md text-center pointer-events-auto">
        <div className="text-3xl mb-2">✦</div>
        <div className="display text-xl mb-1">Let's lay out your first piece</div>
        <div className="text-sm text-[color:var(--color-ink-3)] mb-5">
          Sketch a polygon, drop in a rectangle, or analyse a reference photo —
          everything you draw is real-world millimetres.
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button className="btn lift" onClick={onDrawPolygon}>
            <div className="text-lg mb-0.5">▱</div>
            <div className="text-[11px]">Draw polygon</div>
          </button>
          <button className="btn lift" onClick={onAddRectangle}>
            <div className="text-lg mb-0.5">▭</div>
            <div className="text-[11px]">Add rectangle</div>
          </button>
          <button className="btn lift" onClick={onAnalysePhoto}>
            <div className="text-lg mb-0.5 ai-grad bg-clip-text text-transparent">
              ✦
            </div>
            <div className="text-[11px]">Analyse photo</div>
          </button>
        </div>
        <div className="mt-4 text-[10px] mono text-[color:var(--color-ink-3)]">
          shortcuts · v select · p polygon · b pen · m measure · s seam · h pan
        </div>
      </div>
    </div>
  );
}
