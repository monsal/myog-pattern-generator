import type { Project, SeamStatus } from "../types";
import { edgeLength } from "./geometry";

export type EdgeSeamInfo = {
  pieceId: string;
  edge: number;
  connectedTo?: { pieceId: string; edge: number };
  status: SeamStatus;
  delta?: number; // mm absolute difference if mismatched
  length: number;
};

export const edgeStatus = (
  project: Project,
  pieceId: string,
  edge: number
): EdgeSeamInfo => {
  const piece = project.pieces.find((p) => p.id === pieceId);
  const length = piece ? edgeLength(piece.points, edge) : 0;
  const seam = project.seams.find(
    (s) =>
      (s.fromPieceId === pieceId && s.fromEdge === edge) ||
      (s.toPieceId === pieceId && s.toEdge === edge)
  );
  if (!seam) return { pieceId, edge, status: "unconnected", length };
  const other =
    seam.fromPieceId === pieceId
      ? { id: seam.toPieceId, edge: seam.toEdge }
      : { id: seam.fromPieceId, edge: seam.fromEdge };
  const otherPiece = project.pieces.find((p) => p.id === other.id);
  if (!otherPiece) return { pieceId, edge, status: "unconnected", length };
  const otherLen = edgeLength(otherPiece.points, other.edge);
  const delta = Math.abs(length - otherLen);
  let status: SeamStatus = "ok";
  if (delta > 5) status = "bad";
  else if (delta > 1) status = "warn";
  return {
    pieceId,
    edge,
    connectedTo: { pieceId: other.id, edge: other.edge },
    status,
    delta,
    length,
  };
};

export const projectSeamSummary = (project: Project) => {
  let ok = 0;
  let warn = 0;
  let bad = 0;
  for (const s of project.seams) {
    const info = edgeStatus(project, s.fromPieceId, s.fromEdge);
    if (info.status === "ok") ok++;
    else if (info.status === "warn") warn++;
    else if (info.status === "bad") bad++;
  }
  const totalEdges = project.pieces.reduce((acc, p) => acc + p.points.length, 0);
  const unconnected = totalEdges - project.seams.length * 2;
  return { ok, warn, bad, unconnected: Math.max(0, unconnected) };
};
