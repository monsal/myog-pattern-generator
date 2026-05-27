import { useEffect, useMemo, useRef, useState } from "react";
import type { PatternPiece, Point, Project } from "../types";
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
  // Tool-specific transient state. All in mm in piece-world coords.
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [cursorMm, setCursorMm] = useState<Point | null>(null);
  const [measure, setMeasure] = useState<{ from: Point; to: Point; frozen: boolean } | null>(null);
  const updatePiece = useStore((s) => s.updatePiece);
  const addSeam = useStore((s) => s.addSeam);
  const addPiece = useStore((s) => s.addPiece);
  const addMarking = useStore((s) => s.addMarking);

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

  // Clear transient drafts when switching tool.
  useEffect(() => {
    setDraftPoints([]);
    setMeasure(null);
    setPendingSeam(null);
  }, [tool]);

  // Commit a polygon/pen draft into a new piece.
  const commitDraft = (mode: "polygon" | "pen") => {
    if (draftPoints.length < 3) {
      setDraftPoints([]);
      return;
    }
    let pts = draftPoints;
    if (mode === "pen") {
      // Sample each consecutive pair as a quadratic Bezier using the midpoints
      // as anchors and the original vertices as controls. Produces visibly
      // curved segments while keeping the polygon data model.
      const sampled: Point[] = [];
      const samplesPerEdge = 12;
      for (let i = 0; i < pts.length; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % pts.length];
        const p2 = pts[(i + 2) % pts.length];
        const a = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const c = p1;
        const b = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        for (let t = 0; t < samplesPerEdge; t++) {
          const u = t / samplesPerEdge;
          const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x;
          const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y;
          sampled.push({ x, y });
        }
      }
      pts = sampled;
    }
    const b = polygonBounds(pts);
    const local = pts.map((p) => ({ x: p.x - b.minX, y: p.y - b.minY }));
    const id = addPiece(project.id, {
      points: local,
      position: { x: b.minX, y: b.minY },
      name: mode === "pen" ? "Curved piece" : "Polygon",
    });
    setDraftPoints([]);
    onSelect(id);
  };

  // Keyboard: Enter / Escape for drafts and measure.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (draftPoints.length) setDraftPoints([]);
        if (measure) setMeasure(null);
        if (pendingSeam) setPendingSeam(null);
      } else if (e.key === "Enter") {
        if (tool === "polygon" || tool === "pen") commitDraft(tool);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, draftPoints, measure, pendingSeam]);

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

  const screenToMm = (sx: number, sy: number): Point => ({
    x: pxToMm(sx - pan.x, zoom),
    y: pxToMm(sy - pan.y, zoom),
  });

  // Find which piece (if any) contains a world-mm point. Pieces are convex in
  // practice in the editor, so a bounds + winding test is sufficient.
  const pieceAt = (m: Point): PatternPiece | null => {
    for (let i = project.pieces.length - 1; i >= 0; i--) {
      const piece = project.pieces[i];
      const world = piece.points.map((p) => ({
        x: p.x + piece.position.x,
        y: p.y + piece.position.y,
      }));
      if (pointInPolygon(m, world)) return piece;
    }
    return null;
  };

  // Project a world-mm point onto a piece's nearest edge. Returns the piece,
  // edge index, projected world-mm point, and distance to that point in mm.
  const projectToEdge = (m: Point) => {
    let best: {
      piece: PatternPiece;
      edge: number;
      world: Point;
      local: Point;
      dist: number;
    } | null = null;
    for (const piece of project.pieces) {
      for (let i = 0; i < piece.points.length; i++) {
        const a = {
          x: piece.points[i].x + piece.position.x,
          y: piece.points[i].y + piece.position.y,
        };
        const b = {
          x: piece.points[(i + 1) % piece.points.length].x + piece.position.x,
          y: piece.points[(i + 1) % piece.points.length].y + piece.position.y,
        };
        const proj = projectPointOnSegment(m, a, b);
        if (!best || proj.dist < best.dist) {
          best = {
            piece,
            edge: i,
            world: proj.point,
            local: { x: proj.point.x - piece.position.x, y: proj.point.y - piece.position.y },
            dist: proj.dist,
          };
        }
      }
    }
    return best;
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

  // Canvas-level click handler for tool actions that don't drag.
  const onCanvasClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const m = screenToMm(sx, sy);

    if (tool === "polygon" || tool === "pen") {
      // Double-click commits.
      if (e.detail >= 2) {
        commitDraft(tool);
        return;
      }
      setDraftPoints((d) => [...d, m]);
      return;
    }
    if (tool === "measure") {
      if (!measure || measure.frozen) {
        setMeasure({ from: m, to: m, frozen: false });
      } else {
        setMeasure({ ...measure, to: m, frozen: true });
      }
      return;
    }
    if (tool === "notch") {
      const hit = projectToEdge(m);
      // Accept clicks within 8 px of an edge.
      const tolMm = pxToMm(8, zoom);
      if (hit && hit.dist <= tolMm) {
        addMarking(project.id, hit.piece.id, {
          kind: "notch",
          position: hit.local,
        });
        onSelect(hit.piece.id);
      }
      return;
    }
    if (tool === "grain") {
      const piece = pieceAt(m);
      if (piece) {
        addMarking(
          project.id,
          piece.id,
          {
            kind: "grain",
            angle: 0,
            position: { x: m.x - piece.position.x, y: m.y - piece.position.y },
          },
          { replaceKind: "grain" }
        );
        onSelect(piece.id);
      }
      return;
    }
    // Plain clear-selection click on background:
    if (e.target === containerRef.current) onSelect(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Always update cursor mm position so tool overlays can track it.
    const m = screenToMm(x, y);
    if (tool === "polygon" || tool === "pen") setCursorMm(m);
    if (tool === "measure" && measure && !measure.frozen) {
      setMeasure({ ...measure, to: m });
    }
    if (!dragging) return;
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
      onClick={onCanvasClick}
      onDoubleClick={(e) => {
        if (tool === "polygon" || tool === "pen") {
          e.preventDefault();
          commitDraft(tool);
        }
      }}
      style={{ cursor: toolCursor(tool) }}
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
        {/* Draft polygon / pen overlay */}
        {(tool === "polygon" || tool === "pen") && draftPoints.length > 0 && (
          <g>
            <polyline
              points={[
                ...draftPoints.map((p) => toScreen(p.x, p.y)),
                ...(cursorMm ? [toScreen(cursorMm.x, cursorMm.y)] : []),
              ]
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill="none"
              stroke="#5B4FCF"
              strokeDasharray="5 3"
              strokeWidth={1.5}
            />
            {draftPoints.map((p, i) => {
              const s = toScreen(p.x, p.y);
              return (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={i === 0 ? 5 : 3}
                  fill={i === 0 ? "#5B4FCF" : "white"}
                  stroke="#5B4FCF"
                  strokeWidth={1.5}
                />
              );
            })}
          </g>
        )}

        {/* Measure overlay */}
        {tool === "measure" && measure && (() => {
          const a = toScreen(measure.from.x, measure.from.y);
          const b = toScreen(measure.to.x, measure.to.y);
          const len = Math.hypot(measure.to.x - measure.from.x, measure.to.y - measure.from.y);
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return (
            <g>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3D6B8F" strokeWidth={1.5} />
              <line x1={a.x - 5} y1={a.y - 5} x2={a.x + 5} y2={a.y + 5} stroke="#3D6B8F" strokeWidth={1.5} />
              <line x1={a.x - 5} y1={a.y + 5} x2={a.x + 5} y2={a.y - 5} stroke="#3D6B8F" strokeWidth={1.5} />
              <line x1={b.x - 5} y1={b.y - 5} x2={b.x + 5} y2={b.y + 5} stroke="#3D6B8F" strokeWidth={1.5} />
              <line x1={b.x - 5} y1={b.y + 5} x2={b.x + 5} y2={b.y - 5} stroke="#3D6B8F" strokeWidth={1.5} />
              <rect
                x={mid.x - 30}
                y={mid.y - 18}
                width={60}
                height={18}
                rx={8}
                fill="white"
                stroke="#3D6B8F"
                strokeWidth={0.8}
              />
              <text
                x={mid.x}
                y={mid.y - 5}
                textAnchor="middle"
                fontSize="11"
                fontFamily="DM Mono"
                fontWeight={600}
                fill="#3D6B8F"
              >
                {len.toFixed(1)} mm
              </text>
            </g>
          );
        })()}

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

function toolCursor(tool: Tool): string {
  switch (tool) {
    case "pan":
      return "grab";
    case "polygon":
    case "pen":
    case "measure":
    case "notch":
    case "grain":
    case "seam":
      return "crosshair";
    default:
      return "default";
  }
}

function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function projectPointOnSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + dx * t, y: a.y + dy * t };
  const dist = Math.hypot(p.x - point.x, p.y - point.y);
  return { point, dist };
}
