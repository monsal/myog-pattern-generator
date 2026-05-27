import { useMemo, useState } from "react";
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
  const [view, setView] = useState<"2d" | "3d" | "both">("both");
  const [showAi, setShowAi] = useState(false);
  const [exporting, setExporting] = useState(false);

  const piece = useMemo(
    () => project?.pieces.find((p) => p.id === selectedPieceId) ?? null,
    [project, selectedPieceId]
  );

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
              <Preview3D project={project} selectedPieceId={selectedPieceId} />
            </div>
          )}
        </div>

        <RightSidebar project={project} piece={piece} />
      </div>

      <StatusBar project={project} piece={piece} savedAt={project.updatedAt} />

      {showAi && (
        <PhotoAnalysisSheet projectId={project.id} onClose={() => setShowAi(false)} />
      )}
    </div>
  );
}
