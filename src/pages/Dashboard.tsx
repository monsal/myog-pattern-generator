import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/projects";
import type { GearType } from "../types";

const GEAR_TYPES: { id: GearType; label: string; glyph: string }[] = [
  { id: "backpack", label: "Backpack", glyph: "🎒" },
  { id: "stuff-sack", label: "Stuff sack", glyph: "👝" },
  { id: "hip-pack", label: "Hip pack", glyph: "👜" },
  { id: "frame-bag", label: "Frame bag", glyph: "🚲" },
  { id: "pouch", label: "Pouch", glyph: "📦" },
  { id: "other", label: "Other", glyph: "✨" },
];

export default function Dashboard() {
  const projects = useStore((s) => s.projects);
  const createProject = useStore((s) => s.createProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
            style={{ background: "var(--color-accent)" }}
          >
            <span className="display text-xl">▤</span>
          </div>
          <div>
            <div className="display font-extrabold text-lg leading-none">
              GearPattern
            </div>
            <div className="text-xs text-[color:var(--color-ink-3)]">
              MYOG pattern designer
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowNew(true)}
        >
          + New project
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-6">
        <div className="display text-2xl mb-1">Your projects</div>
        <div className="text-sm text-[color:var(--color-ink-3)] mb-6">
          {projects.length === 0
            ? "Nothing here yet. Start a new project to lay out your first pattern pieces."
            : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
        </div>

        {projects.length === 0 ? (
          <button
            onClick={() => setShowNew(true)}
            className="w-full lift rounded-3xl border-2 border-dashed border-black/15 bg-white/60 py-16 text-center"
          >
            <div className="text-4xl mb-2">✦</div>
            <div className="display font-bold">Create your first project</div>
            <div className="text-xs text-[color:var(--color-ink-3)] mt-1">
              Start blank or analyse a photo of an existing bag
            </div>
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link
                to={`/projects/${p.id}`}
                key={p.id}
                className="lift glass rounded-3xl p-5 block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">
                    {GEAR_TYPES.find((g) => g.id === p.gearType)?.glyph ?? "✦"}
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="icon-btn !w-7 !h-7 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        duplicateProject(p.id);
                      }}
                      title="Duplicate"
                    >
                      ⧉
                    </button>
                    <button
                      className="icon-btn !w-7 !h-7 text-xs hover:!bg-[color:var(--color-bad)]/10 hover:!text-[color:var(--color-bad)]"
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id);
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="display font-bold text-lg truncate">
                  {p.name}
                </div>
                <div className="text-xs text-[color:var(--color-ink-3)] mt-0.5">
                  {p.gearType} · {p.pieces.length} piece
                  {p.pieces.length === 1 ? "" : "s"}
                </div>
                <div className="mono text-[10px] text-[color:var(--color-ink-3)] mt-3">
                  v{p.version} · {new Date(p.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewProjectSheet
          onClose={() => setShowNew(false)}
          onCreate={(name, gearType) => {
            const p = createProject({ name, gearType });
            setShowNew(false);
            navigate(`/projects/${p.id}`);
          }}
        />
      )}
    </div>
  );
}

function NewProjectSheet({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, type: GearType) => void;
}) {
  const [name, setName] = useState("New backpack");
  const [type, setType] = useState<GearType>("backpack");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[color:var(--color-surface-solid)] rounded-3xl shadow-2xl w-full max-w-md m-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl mb-3">New project</h2>
        <label className="block">
          <div className="label mb-1">Project name</div>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <div className="label mt-4 mb-2">Gear type</div>
        <div className="grid grid-cols-3 gap-2">
          {GEAR_TYPES.map((g) => (
            <button
              key={g.id}
              onClick={() => setType(g.id)}
              className={`spring rounded-2xl p-3 flex flex-col items-center gap-1 ${
                type === g.id
                  ? "bg-[color:var(--color-accent)] text-white"
                  : "bg-black/[0.03] hover:bg-black/[0.06]"
              }`}
            >
              <span className="text-xl">{g.glyph}</span>
              <span className="text-[11px] display font-semibold">{g.label}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onCreate(name.trim() || "Untitled", type)}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
