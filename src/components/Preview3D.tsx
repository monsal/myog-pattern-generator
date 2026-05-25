import type { Project } from "../types";
import { polygonArea } from "../lib/geometry";

// Phase 2 placeholder for the rigid Three.js assembly preview.
// Shows fabric info chip and a stylized iso "exploded" representation of pieces
// scaled by their real area. This is intentionally lightweight to keep
// the editor responsive; Three.js geometry will replace it in phase 2.
export default function Preview3D({ project }: { project: Project }) {
  const totalAreaMm2 = project.pieces.reduce(
    (acc, p) => acc + polygonArea(p.points) * p.cutQuantity,
    0
  );
  const firstMaterial = project.materials.find(
    (m) => m.id === project.pieces[0]?.materialId
  );
  return (
    <div className="relative w-full h-full bg-[#F4EFE7] rounded-l-2xl overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.6), rgba(238,233,226,1) 70%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: 280, height: 280 }}>
          {project.pieces.slice(0, 6).map((p, i) => {
            const mat = project.materials.find((m) => m.id === p.materialId);
            const color = mat?.color ?? "#5B7FA6";
            const angle = (i / Math.max(1, project.pieces.length)) * Math.PI * 2;
            const r = 80;
            const x = 140 + Math.cos(angle) * r;
            const y = 140 + Math.sin(angle) * r;
            return (
              <div
                key={p.id}
                className="absolute spring"
                style={{
                  left: x - 40,
                  top: y - 30,
                  width: 80,
                  height: 60,
                  background: color,
                  opacity: 0.85,
                  borderRadius: 6,
                  transform: `perspective(400px) rotateX(55deg) rotateZ(${(i * 32) % 360}deg)`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                }}
              />
            );
          })}
          <div
            className="absolute inset-0 flex items-center justify-center text-[color:var(--color-ink-3)] text-xs label"
            style={{ pointerEvents: "none" }}
          >
            3D assembly preview
          </div>
        </div>
      </div>
      <div className="absolute bottom-3 left-3 glass rounded-2xl px-3 py-2 flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: firstMaterial?.color ?? "#999" }}
        />
        <div>
          <div className="text-[11px] mono">
            {firstMaterial ? `${firstMaterial.name} · ${firstMaterial.weight} g/m²` : "no material"}
          </div>
          <div className="text-[10px] text-[color:var(--color-ink-3)]">
            total {(totalAreaMm2 / 1_000_000).toFixed(2)} m²
          </div>
        </div>
      </div>
      <div className="absolute top-3 right-3 text-[10px] label text-[color:var(--color-ink-3)]">
        rigid panel preview · phase 2 will add Three.js
      </div>
    </div>
  );
}
