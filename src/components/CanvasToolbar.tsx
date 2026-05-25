import type { Project } from "../types";
import { useStore } from "../store/projects";

export default function CanvasToolbar({
  project,
  view,
  onViewChange,
}: {
  project: Project;
  view: "2d" | "3d" | "both";
  onViewChange: (v: "2d" | "3d" | "both") => void;
}) {
  const updateProject = useStore((s) => s.updateProject);
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="glass rounded-full px-2 py-1.5 flex items-center gap-1">
        <Seg active={view === "both"} onClick={() => onViewChange("both")}>2D + 3D</Seg>
        <Seg active={view === "2d"} onClick={() => onViewChange("2d")}>2D only</Seg>
        <Seg active={view === "3d"} onClick={() => onViewChange("3d")}>3D only</Seg>
        <div className="w-px h-5 bg-black/10 mx-1" />
        <label className="text-[11px] label">Paper</label>
        <select
          className="bg-transparent text-[12px] mono outline-none cursor-pointer"
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
        <select
          className="bg-transparent text-[12px] mono outline-none cursor-pointer"
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
        <div className="w-px h-5 bg-black/10 mx-1" />
        <label className="text-[11px] label">Units</label>
        <span className="mono text-[12px] px-1">mm</span>
      </div>
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold display spring ${
        active
          ? "bg-[color:var(--color-accent)] text-white"
          : "text-[color:var(--color-ink-2)] hover:bg-black/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
