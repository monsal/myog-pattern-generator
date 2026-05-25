export type Tool =
  | "select"
  | "polygon"
  | "pen"
  | "measure"
  | "notch"
  | "grain"
  | "seam"
  | "pan"
  | "zoom";

const TOOLS: { id: Tool; label: string; glyph: string }[] = [
  { id: "select", label: "Select", glyph: "↖" },
  { id: "polygon", label: "Draw polygon", glyph: "▱" },
  { id: "pen", label: "Pen / bezier", glyph: "✎" },
  { id: "measure", label: "Measure", glyph: "↔" },
  { id: "notch", label: "Add notch", glyph: "✕" },
  { id: "grain", label: "Add grain line", glyph: "↥" },
  { id: "seam", label: "Sewing line", glyph: "⇌" },
  { id: "pan", label: "Pan", glyph: "✋" },
  { id: "zoom", label: "Zoom", glyph: "⌖" },
];

export default function Toolstrip({
  active,
  onChange,
}: {
  active: Tool;
  onChange: (t: Tool) => void;
}) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
      <div className="glass rounded-3xl p-1.5 flex flex-col gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`icon-btn ${active === t.id ? "active" : ""}`}
            title={t.label}
            onClick={() => onChange(t.id)}
          >
            <span className="text-lg">{t.glyph}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
