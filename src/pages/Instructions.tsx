import { Link, useParams } from "react-router-dom";
import { useStore, uid } from "../store/projects";

export default function Instructions() {
  const { id } = useParams();
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const updateProject = useStore((s) => s.updateProject);

  if (!project) return null;

  const addStep = () =>
    updateProject(project.id, (p) => {
      p.steps.push({
        id: uid("step"),
        title: `Step ${p.steps.length + 1}`,
        body: "",
        pieceIds: [],
      });
    });

  const removeStep = (sid: string) =>
    updateProject(project.id, (p) => {
      p.steps = p.steps.filter((s) => s.id !== sid);
    });

  const move = (idx: number, dir: -1 | 1) =>
    updateProject(project.id, (p) => {
      const j = idx + dir;
      if (j < 0 || j >= p.steps.length) return;
      [p.steps[idx], p.steps[j]] = [p.steps[j], p.steps[idx]];
    });

  return (
    <div className="min-h-screen">
      <header className="h-14 px-4 flex items-center gap-3 border-b border-black/[0.07] bg-white/60 backdrop-blur">
        <Link to={`/projects/${project.id}`} className="icon-btn">
          ‹
        </Link>
        <div className="display font-extrabold">{project.name} · Instructions</div>
        <div className="flex-1" />
        <button className="btn btn-primary" onClick={addStep}>
          + Add step
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        {project.steps.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">📝</div>
            <div className="display text-lg">No steps yet</div>
            <div className="text-sm text-[color:var(--color-ink-3)] mb-4">
              Build out the sewing order for whoever follows your pattern.
            </div>
            <button className="btn btn-primary" onClick={addStep}>
              Add first step
            </button>
          </div>
        )}
        <ol className="flex flex-col gap-3">
          {project.steps.map((step, idx) => (
            <li key={step.id} className="glass rounded-2xl p-4 flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="display font-extrabold text-[color:var(--color-accent)]">
                  {idx + 1}
                </div>
                <button className="icon-btn !w-7 !h-7" onClick={() => move(idx, -1)}>
                  ↑
                </button>
                <button className="icon-btn !w-7 !h-7" onClick={() => move(idx, 1)}>
                  ↓
                </button>
              </div>
              <div className="flex-1">
                <input
                  className="display font-bold text-base bg-transparent outline-none w-full"
                  value={step.title}
                  onChange={(e) =>
                    updateProject(project.id, (p) => {
                      const s = p.steps.find((x) => x.id === step.id);
                      if (s) s.title = e.target.value;
                    })
                  }
                />
                <textarea
                  className="field mt-2"
                  rows={3}
                  placeholder="Describe how to assemble these pieces…"
                  value={step.body}
                  onChange={(e) =>
                    updateProject(project.id, (p) => {
                      const s = p.steps.find((x) => x.id === step.id);
                      if (s) s.body = e.target.value;
                    })
                  }
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {project.pieces.map((pc) => {
                    const on = step.pieceIds.includes(pc.id);
                    return (
                      <button
                        key={pc.id}
                        onClick={() =>
                          updateProject(project.id, (p) => {
                            const s = p.steps.find((x) => x.id === step.id);
                            if (!s) return;
                            s.pieceIds = on
                              ? s.pieceIds.filter((x) => x !== pc.id)
                              : [...s.pieceIds, pc.id];
                          })
                        }
                        className={`spring rounded-full px-2.5 py-1 text-[11px] display font-semibold ${
                          on
                            ? "bg-[color:var(--color-accent)] text-white"
                            : "bg-black/[0.05] text-[color:var(--color-ink-2)]"
                        }`}
                      >
                        {pc.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                className="icon-btn !w-7 !h-7 hover:!bg-[color:var(--color-bad)]/10 hover:!text-[color:var(--color-bad)]"
                onClick={() => removeStep(step.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
