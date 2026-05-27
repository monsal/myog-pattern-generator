// Builds a 3D rigid-panel assembly from pattern pieces + seam connections.
//
// Algorithm: pick a root piece, place it flat in the XZ plane (Y up). Walk a
// breadth-first traversal of the seam graph. For each placed piece P with a
// seam to an unplaced neighbour N along edge e_P (in P) <-> e_N (in N), we
// rotate/translate N so that its e_N edge coincides with P's e_P edge in 3D
// space, then tilt N around that shared edge by a dihedral angle. The
// default dihedral is ~95° which gives a believable upright "boxy" preview
// of a backpack-like assembly; cloth physics is intentionally out of scope.

import * as THREE from "three";
import type { Project, PatternPiece } from "../types";

const DEFAULT_DIHEDRAL_DEG = 95;

export type PlacedPiece = {
  piece: PatternPiece;
  /** World-space positions of each polygon vertex, in mm. */
  worldPoints: THREE.Vector3[];
  /** Outward normal of the panel in world space (unit). */
  normal: THREE.Vector3;
  color: string;
};

export type AssemblyResult = {
  placed: PlacedPiece[];
  /** Seam id -> the two world-space endpoints (start/end on the shared edge). */
  seamLines: Record<string, { a: THREE.Vector3; b: THREE.Vector3 }>;
};

const localEdge = (piece: PatternPiece, edge: number) => {
  const a = piece.points[edge];
  const b = piece.points[(edge + 1) % piece.points.length];
  return { a, b };
};

// Place piece flat in a plane defined by an existing edge endpoints (A,B) and
// a tilt around that edge from the parent's normal. `edge` is the edge in
// `piece` that should coincide with segment A->B (in world space), optionally
// flipped.
function placeAlongEdge(
  piece: PatternPiece,
  edgeIndex: number,
  A: THREE.Vector3,
  B: THREE.Vector3,
  parentNormal: THREE.Vector3,
  dihedralDeg: number,
  flipped: boolean
): PlacedPiece {
  const { a: la, b: lb } = localEdge(piece, edgeIndex);
  const localA = new THREE.Vector2(la.x, la.y);
  const localB = new THREE.Vector2(lb.x, lb.y);
  // Build local-space frame where the edge lies along +X starting at origin.
  const localDir = new THREE.Vector2().subVectors(localB, localA);
  const localLen = localDir.length() || 1;
  localDir.divideScalar(localLen);
  const localPerp = new THREE.Vector2(-localDir.y, localDir.x); // 90° CCW in 2D

  // World-space frame for the destination edge.
  const worldEdge = new THREE.Vector3().subVectors(B, A);
  const worldLen = worldEdge.length() || 1;
  const X = worldEdge.clone().multiplyScalar(1 / worldLen);
  // Tangent perpendicular to the edge in the plane of the parent panel.
  // We orient piece's "interior" away from parent's interior using the dihedral.
  const Yparent = new THREE.Vector3().crossVectors(parentNormal, X).normalize();
  const tilt = THREE.MathUtils.degToRad(180 - dihedralDeg);
  const Y = Yparent
    .clone()
    .multiplyScalar(Math.cos(tilt))
    .add(parentNormal.clone().multiplyScalar(Math.sin(tilt)));
  const N = new THREE.Vector3().crossVectors(X, Y).normalize();

  // If the seam is flipped, reverse the local edge direction so the polygon
  // wraps the right way around the seam.
  const sign = flipped ? -1 : 1;
  const worldPoints = piece.points.map((p) => {
    const lp = new THREE.Vector2(p.x, p.y).sub(localA);
    // Decompose lp into (localDir, localPerp), scaling by length so the seam
    // matches B-A exactly.
    const u = lp.dot(localDir) * (worldLen / localLen);
    const v = lp.dot(localPerp); // perpendicular distance, mm
    return A.clone()
      .add(X.clone().multiplyScalar(u * sign + (flipped ? worldLen : 0)))
      .add(Y.clone().multiplyScalar(v * sign));
  });

  return {
    piece,
    worldPoints,
    normal: N,
    color: "#5B7FA6",
  };
}

function placeRoot(piece: PatternPiece): PlacedPiece {
  // Centre at origin, flat in XZ plane (Y = 0), with +X right and -Z up
  // (so a portrait panel reads upright in the camera).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of piece.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const worldPoints = piece.points.map(
    (p) => new THREE.Vector3(p.x - cx, 0, -(p.y - cy))
  );
  return { piece, worldPoints, normal: new THREE.Vector3(0, 1, 0), color: "#5B7FA6" };
}

export function buildAssembly(project: Project): AssemblyResult {
  const placed = new Map<string, PlacedPiece>();
  const seamLines: AssemblyResult["seamLines"] = {};
  if (project.pieces.length === 0) return { placed: [], seamLines };

  // Pick the piece with the largest area as root; falls back to first piece.
  const root =
    [...project.pieces]
      .map((p) => ({ p, score: scorePiece(p) }))
      .sort((a, b) => b.score - a.score)[0]?.p ?? project.pieces[0];
  const rootPlaced = placeRoot(root);
  rootPlaced.color =
    project.materials.find((m) => m.id === root.materialId)?.color ?? "#5B7FA6";
  placed.set(root.id, rootPlaced);

  const queue: string[] = [root.id];
  const seenSeams = new Set<string>();

  while (queue.length) {
    const parentId = queue.shift()!;
    const parent = placed.get(parentId)!;

    const seamsForParent = project.seams.filter(
      (s) =>
        (s.fromPieceId === parentId && !placed.has(s.toPieceId)) ||
        (s.toPieceId === parentId && !placed.has(s.fromPieceId))
    );

    for (const seam of seamsForParent) {
      const fromParent = seam.fromPieceId === parentId;
      const parentEdge = fromParent ? seam.fromEdge : seam.toEdge;
      const neighbourId = fromParent ? seam.toPieceId : seam.fromPieceId;
      const neighbourEdge = fromParent ? seam.toEdge : seam.fromEdge;
      const neighbourPiece = project.pieces.find((p) => p.id === neighbourId);
      if (!neighbourPiece) continue;

      // World-space endpoints of the parent's edge.
      const A = parent.worldPoints[parentEdge];
      const B = parent.worldPoints[(parentEdge + 1) % parent.worldPoints.length];

      // Decide dihedral by neighbour count: panels with 4+ seams (likely a
      // body/back) stay near 90°; lids fold further. The default is 95°.
      const neighbourSeams = project.seams.filter(
        (s) => s.fromPieceId === neighbourId || s.toPieceId === neighbourId
      ).length;
      const dihedral =
        neighbourSeams >= 3 ? 90 : DEFAULT_DIHEDRAL_DEG;

      const np = placeAlongEdge(
        neighbourPiece,
        neighbourEdge,
        A,
        B,
        parent.normal,
        dihedral,
        Boolean(seam.flipped)
      );
      np.color =
        project.materials.find((m) => m.id === neighbourPiece.materialId)
          ?.color ?? "#6B9E7A";

      placed.set(neighbourId, np);
      seamLines[seam.id] = { a: A.clone(), b: B.clone() };
      seenSeams.add(seam.id);
      queue.push(neighbourId);
    }
  }

  // Also record seamLines for seams between two already-placed pieces (cycles).
  for (const seam of project.seams) {
    if (seenSeams.has(seam.id)) continue;
    const from = placed.get(seam.fromPieceId);
    if (!from) continue;
    const A = from.worldPoints[seam.fromEdge];
    const B = from.worldPoints[(seam.fromEdge + 1) % from.worldPoints.length];
    seamLines[seam.id] = { a: A.clone(), b: B.clone() };
  }

  // Place any unconnected pieces in a fan to the side so they still render.
  let lonelyIdx = 0;
  for (const piece of project.pieces) {
    if (placed.has(piece.id)) continue;
    const offsetX = 800 + lonelyIdx * 400;
    const r = placeRoot(piece);
    r.worldPoints = r.worldPoints.map((v) => v.clone().add(new THREE.Vector3(offsetX, 0, 0)));
    r.color =
      project.materials.find((m) => m.id === piece.materialId)?.color ?? "#A8A29E";
    placed.set(piece.id, r);
    lonelyIdx++;
  }

  return { placed: Array.from(placed.values()), seamLines };
}

function scorePiece(p: PatternPiece) {
  // Approximate area * (seam count) so the most-connected, largest piece roots.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pt of p.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  return (maxX - minX) * (maxY - minY);
}

