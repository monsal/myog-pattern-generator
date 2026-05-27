import type { PatternPiece, Point } from "../types";

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const polygonBounds = (pts: Point[]) => {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
};

export const pieceWorldPoints = (p: PatternPiece): Point[] => {
  // Treat points as local — add position. (Rotation: not applied to data here.)
  return p.points.map((pt) => ({ x: pt.x + p.position.x, y: pt.y + p.position.y }));
};

export const pieceBounds = (p: PatternPiece) => polygonBounds(pieceWorldPoints(p));

export const polygonArea = (pts: Point[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2;
};

export const edgeLength = (pts: Point[], edgeIndex: number) => {
  const a = pts[edgeIndex];
  const b = pts[(edgeIndex + 1) % pts.length];
  return dist(a, b);
};

// Outward-offset polygon by `d` (mm). Approximates seam allowance OUTLINE outside the cut line.
// Polygon assumed counter-clockwise; we offset along the outward normal.
// (For the inner dashed seam allowance line we use negative offset = inward.)
export const offsetPolygon = (pts: Point[], d: number): Point[] => {
  const n = pts.length;
  if (n < 3) return pts;
  // ensure CCW
  let signed = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signed += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  const ccw = signed > 0;
  const sign = ccw ? 1 : -1;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const n1 = normal(prev, cur, sign);
    const n2 = normal(cur, next, sign);
    // bisector
    const bx = n1.x + n2.x;
    const by = n1.y + n2.y;
    const blen = Math.hypot(bx, by) || 1;
    const cosHalf = (n1.x * n2.x + n1.y * n2.y + 1) / 2; // avoid div by zero
    const factor = d / Math.max(0.2, Math.sqrt(Math.max(0.001, cosHalf)));
    out.push({ x: cur.x + (bx / blen) * factor, y: cur.y + (by / blen) * factor });
  }
  return out;
};

function normal(a: Point, b: Point, sign: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: (-dy / len) * sign, y: (dx / len) * sign };
}

// Per-edge outward offset: each edge i gets its own distance distances[i].
// Adjacent offset lines are intersected to produce the new vertex between
// them. Falls back gracefully for near-parallel edges by clipping at the
// original vertex offset by the average normal.
export const offsetPolygonPerEdge = (pts: Point[], distances: number[]): Point[] => {
  const n = pts.length;
  if (n < 3) return pts;
  // CCW sign
  let signed = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signed += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  const sign = signed > 0 ? 1 : -1;

  // Outward unit normals per edge.
  const edgeNormal = (i: number): Point => {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: (-dy / len) * sign, y: (dx / len) * sign };
  };

  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n;
    const n1 = edgeNormal(prevIdx);
    const n2 = edgeNormal(i);
    const d1 = distances[prevIdx] ?? 0;
    const d2 = distances[i] ?? 0;
    // The two offset lines:
    //   line 1 passes through pts[i] + n1*d1, direction = pts[i+1?]-pts[prev]... no,
    //   line 1 passes through pts[i] + n1*d1, direction = (pts[i] - pts[prev]).
    const a1 = { x: pts[i].x + n1.x * d1, y: pts[i].y + n1.y * d1 };
    const a2 = { x: pts[i].x + n2.x * d2, y: pts[i].y + n2.y * d2 };
    const dir1 = {
      x: pts[i].x - pts[prevIdx].x,
      y: pts[i].y - pts[prevIdx].y,
    };
    const dir2 = {
      x: pts[(i + 1) % n].x - pts[i].x,
      y: pts[(i + 1) % n].y - pts[i].y,
    };
    // Intersect a1+t*dir1 == a2+s*dir2
    const denom = dir1.x * dir2.y - dir1.y * dir2.x;
    if (Math.abs(denom) < 1e-6) {
      // near-parallel: use bisector of normals
      const bx = n1.x + n2.x;
      const by = n1.y + n2.y;
      const blen = Math.hypot(bx, by) || 1;
      const d = (d1 + d2) / 2;
      out.push({ x: pts[i].x + (bx / blen) * d, y: pts[i].y + (by / blen) * d });
      continue;
    }
    const dx = a2.x - a1.x;
    const dy = a2.y - a1.y;
    const t = (dx * dir2.y - dy * dir2.x) / denom;
    out.push({ x: a1.x + dir1.x * t, y: a1.y + dir1.y * t });
  }
  return out;
};

// Resolves the array of per-edge SA values for a piece.
export const pieceEdgeSeamAllowances = (
  pts: Point[],
  uniform: number,
  overrides?: Record<number, number>
): number[] => {
  return pts.map((_, i) => overrides?.[i] ?? uniform);
};

export const rectPoints = (w: number, h: number): Point[] => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: h },
  { x: 0, y: h },
];

export const trapezoidPoints = (wTop: number, wBottom: number, h: number): Point[] => {
  const inset = (wBottom - wTop) / 2;
  return [
    { x: inset, y: 0 },
    { x: inset + wTop, y: 0 },
    { x: wBottom, y: h },
    { x: 0, y: h },
  ];
};
