import { useEffect, useMemo, useRef, useState } from "react";
import type { PatternPiece, Project } from "../types";
import { mmToPx, pxToMm, PAPER_MM } from "../lib/units";
import { offsetPolygon, edgeLength, polygonBounds } from "../lib/geometry";
import { edgeStatus } from "../lib/seams";
import { useStore } from "../store/projects";

type Tool =
  | "select"
  | "polygon"
  | "pen"
  | "measure"
  | "notch"
  | "grain"
  | "seam"
  | "pan"
  | "zoom";

type Props = {
  project: Project;
  tool: Tool;
  selectedPieceId: string | null;
  onSelect: (id: string | null) => void;
};

type PendingSeam = { pieceId: string; edge: number } | null;

export default function Canvas({ project, tool, selectedPieceId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<
    | { kind: "pan"; sx: number; sy: number; px: number; py: number }
    | { kind: "move"; pieceId: string; sx: number; sy: number; px: number; py: number }
    | { kind: "resize"; pieceId: string; handle: string; sx: number; sy: number; b: ReturnType<typeof polygonBounds> }
    | null
  >(null);
  const [pendingSeam, setPendingSeam] = useState<PendingSeam>(null);
  const updatePiece = useStore((s) => s.updatePiece);
  const addSeam = useStore((s) => s.addSeam);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit A4 to ~70% height on first sizing
  useEffect(() => {
    if (size.h === 0) return;
    setPan({ x: size.w / 2 - mmToPx(PAPER_MM.A4.w / 2, zoom), y: 60 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.h]);

  const toScreen = (xMm: number, yMm: number) => ({
    x: pan.x + mmToPx(xMm, zoom),
    y: pan.y + mmToPx(yMm, zoom),
  });

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const newZoom = Math.max(0.1, Math.min(4, zoom * factor));
      // keep cursor anchor stable
      const mmX = pxToMm(mx - pan.x, zoom);
      const mmY = pxToMm(my - pan.y, zoom);
      setPan({ x: mx - mmToPx(mmX, newZoom), y: my - mmToPx(mmY, newZoom) });
      setZoom(newZoom);
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (tool === "pan" || e.button === 1 || e.altKey) {
      setDragging({ kind: "pan", sx, sy, px: pan.x, py: pan.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (dragging.kind === "pan") {
      setPan({ x: dragging.px + (x - dragging.sx), y: dragging.py + (y - dragging.sy) });
    } else if (dragging.kind === "move") {
      const dxMm = pxToMm(x - dragging.sx, zoom);
      const dyMm = pxToMm(y - dragging.sy, zoom);
      updatePiece(project.id, dragging.pieceId, (p) => {
        p.position = { x: dragging.px + dxMm, y: dragging.py + dyMm };
      });
    } else if (dragging.kind === "resize") {
      const dxMm = pxToMm(x - dragging.sx, zoom);
      const dyMm = pxToMm(y - dragging.sy, zoom);
      const handle = dragging.handle;
      updatePiece(project.id, dragging.pieceId, (p) => {
        const b = dragging.b;
        let newW = b.w;
        let newH = b.h;
        if (handle.includes("e")) newW = Math.max(20, b.w + dxMm);
        if (handle.includes("w")) newW = Math.max(20, b.w - dxMm);
        if (handle.includes("s")) newH = Math.max(20, b.h + dyMm);
        if (handle.includes("n")) newH = Math.max(20, b.h - dyMm);
        const sx = newW / b.w;
        const sy = newH / b.h;
        p.points = p.points.map((pt) => ({
          x: b.minX + (pt.x - b.minX) * sx,
          y: b.minY + (pt.y - b.minY) * sy,
        }));
        if (handle.includes("w")) p.position = { ...p.position, x: p.position.x + (b.w - newW) };
        if (handle.includes("n")) p.position = { ...p.position, y: p.position.y + (b.h - newH) };
      });
    }
  };

  const onMouseUp = () => setDragging(null);

  const onPieceMouseDown = (e: React.MouseEvent, piece: PatternPiece) => {
    e.stopPropagation();
    onSelect(piece.id);
    if (tool !== "select" && tool !== "pan") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({
      kind: "move",
      pieceId: piece.id,
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
      px: piece.position.x,
      py: piece.position.y,
    });
  };

  const onHandleDown = (
    e: React.MouseEvent,
    piece: PatternPiece,
    handle: string
  ) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const b = polygonBounds(piece.points);
    setDragging({
      kind: "resize",
      pieceId: piece.id,
      handle,
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
      b,
    });
  };

  const onEdgeClick = (piece: PatternPiece, edge: number) => {
    if (tool !== "seam") return;
    if (!pendingSeam) {
      setPendingSeam({ pieceId: piece.id, edge });
      onSelect(piece.id);
    } else if (pendingSeam.pieceId !== piece.id) {
      addSeam(project.id, {
        fromPieceId: pendingSeam.pieceId,
        fromEdge: pendingSeam.edge,
        toPieceId: piece.id,
        toEdge: edge,
      });
      setPendingSeam(null);
    } else {
      setPendingSeam({ pieceId: piece.id, edge });
    }
  };

  const paperRect = useMemo(() => {
    const p = PAPER_MM[project.print.paper];
    const w = project.print.orientation === "portrait" ? p.w : p.h;
    const h = project.print.orientation === "portrait" ? p.h : p.w;
    const tl = toScreen(0, 0);
    return { x: tl.x, y: tl.y, w: mmToPx(w, zoom), h: mmToPx(h, zoom) };
  }, [project.print.paper, project.print.orientation, pan.x, pan.y, zoom]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full dot-grid overflow-hidden cursor-default"
      onWheel={handleWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={(e) => {
        if (e.target === containerRef.current) onSelect(null);
      }}
      style={{ cursor: tool === "pan" ? "grab" : "default" }}
    >
      <svg width={size.w} height={size.h} className="absolute inset-0 pointer-events-none">
        {/* paper rectangle hint */}
        <rect
          x={paperRect.x}
          y={paperRect.y}
          width={paperRect.w}
          height={paperRect.h}
          fill="none"
          stroke="rgba(0,0,0,0.10)"
          strokeDasharray="6 4"
          strokeWidth={1}
        />
        <text
          x={paperRect.x + 6}
          y={paperRect.y + 14}
          fill="rgba(0,0,0,0.30)"
          fontSize="10"
          fontFamily="DM Mono"
        >
          {project.print.paper} {project.print.orientation}
        </text>
      </svg>

      <svg
        width={size.w}
        height={size.h}
        className="absolute inset-0"
        style={{ pointerEvents: "none" }}
      >
        {project.pieces.map((piece) => {
          const material = project.materials.find((m) => m.id === piece.materialId);
          const color = material?.color ?? "#5B7FA6";
          const isSel = piece.id === selectedPieceId;
          const screenPts = piece.points
            .map((pt) => toScreen(pt.x + piece.position.x, pt.y + piece.position.y))
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          const inner = offsetPolygon(piece.points, -piece.seamAllowance)
            .map((pt) => toScreen(pt.x + piece.position.x, pt.y + piece.position.y))
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          const b = polygonBounds(piece.points);
          return (
            <g key={piece.id} style={{ pointerEvents: "auto" }}>
              <polygon
                points={screenPts}
                fill={hexToRgba(color, 0.18)}
                stroke={color}
                strokeWidth={isSel ? 2 : 1.25}
                onMouseDown={(e) => onPieceMouseDown(e, piece)}
                style={{ cursor: tool === "select" || tool === "pan" ? "move" : "pointer" }}
              />
              <polygon
                points={inner}
                fill="none"
                stroke={color}
                strokeOpacity={0.55}
                strokeDasharray="4 3"
                strokeWidth={0.8}
              />
              {/* Edges (clickable for seam tool) */}
              {piece.points.map((pt, i) => {
                const a = toScreen(pt.x + piece.position.x, pt.y + piece.position.y);
                const next = piece.points[(i + 1) % piece.points.length];
                const bp = toScreen(next.x + piece.position.x, next.y + piece.position.y);
                const status = edgeStatus(project, piece.id, i);
                const pending =
                  pendingSeam &&
                  pendingSeam.pieceId === piece.id &&
                  pendingSeam.edge === i;
                const edgeColor =
                  status.status === "ok"
                    ? "#3D9970"
                    : status.status === "warn"
                    ? "#D4850A"
                    : status.status === "bad"
                    ? "#C0392B"
                    : pending
                    ? "#5B4FCF"
                    : "transparent";
                const showEdge = tool === "seam" || status.status !== "unconnected" || pending;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={bp.x}
                    y2={bp.y}
                    stroke={edgeColor}
                    strokeWidth={tool === "seam" ? 5 : 3}
                    strokeLinecap="round"
                    style={{
                      cursor: tool === "seam" ? "crosshair" : "default",
                      opacity: showEdge ? (tool === "seam" ? 0.5 : 0.9) : 0,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdgeClick(piece, i);
                    }}
                  />
                );
              })}
              {/* Grain lines and notches */}
              {piece.markings.map((m) => {
                if (m.kind === "grain") {
                  const c = toScreen(m.position.x + piece.position.x, m.position.y + piece.position.y);
                  const len = mmToPx(40, zoom) / 2;
                  return (
                    <g key={m.id}>
                      <line
                        x1={c.x}
                        y1={c.y - len}
                        x2={c.x}
                        y2={c.y + len}
                        stroke={color}
                        strokeWidth={1}
                      />
                      <polygon
                        points={`${c.x - 4},${c.y - len + 8} ${c.x + 4},${c.y - len + 8} ${c.x},${c.y - len}`}
                        fill={color}
                      />
                    </g>
                  );
                }
                if (m.kind === "notch") {
                  const c = toScreen(m.position.x + piece.position.x, m.position.y + piece.position.y);
                  return <circle key={m.id} cx={c.x} cy={c.y} r={3} fill="black" />;
                }
                return null;
              })}
              {/* AI badge */}
              {piece.aiGenerated && (
                <g>
                  <rect
                    x={toScreen(b.minX + piece.position.x, b.minY + piece.position.y).x + 6}
                    y={toScreen(b.minX + piece.position.x, b.minY + piece.position.y).y + 6}
                    rx={8}
                    ry={8}
                    width={42}
                    height={18}
                    fill="url(#aiGrad)"
                    opacity={0.95}
                  />
                  <text
                    x={toScreen(b.minX + piece.position.x, b.minY + piece.position.y).x + 27}
                    y={toScreen(b.minX + piece.position.x, b.minY + piece.position.y).y + 19}
                    fill="white"
                    fontSize="10"
                    fontFamily="Nunito"
                    fontWeight={700}
                    textAnchor="middle"
                  >
                    AI ✦
                  </text>
                </g>
              )}
              {/* Label */}
              <text
                x={toScreen(b.minX + piece.position.x + 8, b.minY + piece.position.y + b.h - 8).x}
                y={toScreen(b.minX + piece.position.x + 8, b.minY + piece.position.y + b.h - 8).y}
                fill={color}
                fontSize="12"
                fontWeight={700}
                fontFamily="Nunito"
                style={{ pointerEvents: "none" }}
              >
                {piece.name}
              </text>
              {/* Resize handles when selected */}
              {isSel && tool === "select" && renderHandles(piece, toScreen, onHandleDown)}
              {/* Dimension tags when selected */}
              {isSel && renderDims(piece, toScreen)}
            </g>
          );
        })}
        <defs>
          <linearGradient id="aiGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5B4FCF" />
            <stop offset="100%" stopColor="#3D6B8F" />
          </linearGradient>
        </defs>
      </svg>

      {/* zoom HUD */}
      <div className="absolute bottom-4 right-4 glass rounded-2xl flex items-center gap-1 p-1">
        <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.1, z * 0.85))}>−</button>
        <div className="mono text-xs px-2 text-[color:var(--color-ink-2)] w-14 text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.min(4, z * 1.15))}>+</button>
        <button
          className="icon-btn"
          title="Reset"
          onClick={() => {
            setZoom(0.7);
            setPan({ x: size.w / 2 - mmToPx(PAPER_MM.A4.w / 2, 0.7), y: 60 });
          }}
        >
          ⤧
        </button>
      </div>

      {pendingSeam && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass rounded-2xl px-4 py-2 text-sm text-[color:var(--color-ink-2)]">
          Click an edge on another piece to connect…{" "}
          <button className="btn-ghost btn ml-2" onClick={() => setPendingSeam(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function renderHandles(
  piece: PatternPiece,
  toScreen: (x: number, y: number) => { x: number; y: number },
  onHandleDown: (e: React.MouseEvent, piece: PatternPiece, h: string) => void
) {
  const b = polygonBounds(piece.points);
  const handles: { id: string; x: number; y: number; cursor: string }[] = [
    { id: "nw", x: b.minX, y: b.minY, cursor: "nwse-resize" },
    { id: "n", x: b.minX + b.w / 2, y: b.minY, cursor: "ns-resize" },
    { id: "ne", x: b.maxX, y: b.minY, cursor: "nesw-resize" },
    { id: "e", x: b.maxX, y: b.minY + b.h / 2, cursor: "ew-resize" },
    { id: "se", x: b.maxX, y: b.maxY, cursor: "nwse-resize" },
    { id: "s", x: b.minX + b.w / 2, y: b.maxY, cursor: "ns-resize" },
    { id: "sw", x: b.minX, y: b.maxY, cursor: "nesw-resize" },
    { id: "w", x: b.minX, y: b.minY + b.h / 2, cursor: "ew-resize" },
  ];
  return handles.map((h) => {
    const s = toScreen(h.x + piece.position.x, h.y + piece.position.y);
    return (
      <rect
        key={h.id}
        x={s.x - 5}
        y={s.y - 5}
        width={10}
        height={10}
        rx={3}
        fill="white"
        stroke="#3D6B8F"
        strokeWidth={1.5}
        style={{ cursor: h.cursor, pointerEvents: "auto" }}
        onMouseDown={(e) => onHandleDown(e, piece, h.id)}
      />
    );
  });
}

function renderDims(
  piece: PatternPiece,
  toScreen: (x: number, y: number) => { x: number; y: number }
) {
  const b = polygonBounds(piece.points);
  const top = toScreen(b.minX + piece.position.x + b.w / 2, b.minY + piece.position.y - 4);
  const right = toScreen(b.maxX + piece.position.x + 4, b.minY + piece.position.y + b.h / 2);
  return (
    <>
      <text
        x={top.x}
        y={top.y}
        textAnchor="middle"
        fontSize="10"
        fontFamily="DM Mono"
        fill="#3D6B8F"
        fontWeight={500}
      >
        {b.w.toFixed(0)} mm
      </text>
      <text
        x={right.x}
        y={right.y}
        fontSize="10"
        fontFamily="DM Mono"
        fill="#3D6B8F"
        fontWeight={500}
      >
        {b.h.toFixed(0)} mm
      </text>
      {/* edge lengths */}
      {piece.points.map((pt, i) => {
        const next = piece.points[(i + 1) % piece.points.length];
        const mid = toScreen(
          (pt.x + next.x) / 2 + piece.position.x,
          (pt.y + next.y) / 2 + piece.position.y
        );
        const len = edgeLength(piece.points, i);
        return (
          <text
            key={i}
            x={mid.x}
            y={mid.y - 4}
            textAnchor="middle"
            fontSize="9"
            fontFamily="DM Mono"
            fill="rgba(0,0,0,0.4)"
          >
            {len.toFixed(0)}
          </text>
        );
      })}
    </>
  );
}
