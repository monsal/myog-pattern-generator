import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GearType,
  Marking,
  PatternPiece,
  Project,
  SeamConnection,
  Point,
} from "../types";
import { DEFAULT_MATERIALS } from "../types";
import { rectPoints } from "../lib/geometry";

type DistributiveOmit<T, K extends keyof any> = T extends unknown
  ? Omit<T, K>
  : never;
export type MarkingInput = DistributiveOmit<Marking, "id">;

export const uid = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

type Store = {
  projects: Project[];
  createProject: (input: {
    name: string;
    description?: string;
    gearType: GearType;
  }) => Project;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  updateProject: (id: string, fn: (p: Project) => void) => void;

  // pieces
  addPiece: (projectId: string, piece?: Partial<PatternPiece>) => string;
  removePiece: (projectId: string, pieceId: string) => void;
  duplicatePiece: (projectId: string, pieceId: string) => string;
  mirrorPiece: (
    projectId: string,
    pieceId: string,
    axis: "x" | "y"
  ) => void;
  updatePiece: (
    projectId: string,
    pieceId: string,
    fn: (p: PatternPiece) => void
  ) => void;
  addMarking: (
    projectId: string,
    pieceId: string,
    marking: MarkingInput,
    options?: { replaceKind?: Marking["kind"] }
  ) => void;

  // seams
  addSeam: (projectId: string, seam: Omit<SeamConnection, "id">) => void;
  removeSeam: (projectId: string, seamId: string) => void;
};

const seedProject = (overrides: Partial<Project>): Project => ({
  id: uid("proj"),
  name: "Untitled project",
  description: "",
  gearType: "backpack",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
  pieces: [],
  materials: DEFAULT_MATERIALS,
  seams: [],
  steps: [],
  print: { paper: "A4", overlapMm: 15, orientation: "portrait" },
  ...overrides,
});

const PIECE_PALETTE = [
  "#5B7FA6", "#6B9E7A", "#C07A50", "#9B7FC4", "#C4A83C",
];

const placeAt = (project: Project): Point => {
  // simple right-of-last placement
  if (project.pieces.length === 0) return { x: 40, y: 40 };
  const last = project.pieces[project.pieces.length - 1];
  return { x: last.position.x + 220, y: last.position.y };
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      projects: [],

      createProject: (input) => {
        const p = seedProject({
          name: input.name || "Untitled project",
          description: input.description ?? "",
          gearType: input.gearType,
        });
        // seed with a back panel
        p.pieces.push({
          id: uid("pc"),
          name: "Back panel",
          points: rectPoints(280, 480),
          position: { x: 60, y: 60 },
          rotation: 0,
          seamAllowance: 10,
          cutQuantity: 1,
          materialId: p.materials[0]?.id,
          markings: [
            {
              id: uid("mk"),
              kind: "grain",
              angle: 0,
              position: { x: 140, y: 240 },
            },
          ],
        });
        set({ projects: [p, ...get().projects] });
        return p;
      },

      deleteProject: (id) =>
        set({ projects: get().projects.filter((p) => p.id !== id) }),

      duplicateProject: (id) => {
        const src = get().projects.find((p) => p.id === id);
        if (!src) return;
        const copy: Project = JSON.parse(JSON.stringify(src));
        copy.id = uid("proj");
        copy.name = `${src.name} copy`;
        copy.createdAt = Date.now();
        copy.updatedAt = Date.now();
        copy.version = 1;
        set({ projects: [copy, ...get().projects] });
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      updateProject: (id, fn) => {
        set({
          projects: get().projects.map((p) => {
            if (p.id !== id) return p;
            const next = JSON.parse(JSON.stringify(p)) as Project;
            fn(next);
            next.updatedAt = Date.now();
            next.version += 1;
            return next;
          }),
        });
      },

      addPiece: (projectId, piece) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return "";
        const id = uid("pc");
        const color = PIECE_PALETTE[project.pieces.length % PIECE_PALETTE.length];
        const mat =
          project.materials.find((m) => m.color === color) ||
          project.materials[0];
        const newPiece: PatternPiece = {
          id,
          name: piece?.name ?? `Piece ${project.pieces.length + 1}`,
          points: piece?.points ?? rectPoints(180, 240),
          position: piece?.position ?? placeAt(project),
          rotation: 0,
          seamAllowance: 10,
          cutQuantity: 1,
          materialId: piece?.materialId ?? mat?.id,
          markings: piece?.markings ?? [],
          aiGenerated: piece?.aiGenerated,
          confidence: piece?.confidence,
        };
        get().updateProject(projectId, (p) => {
          p.pieces.push(newPiece);
        });
        return id;
      },

      removePiece: (projectId, pieceId) =>
        get().updateProject(projectId, (p) => {
          p.pieces = p.pieces.filter((x) => x.id !== pieceId);
          p.seams = p.seams.filter(
            (s) => s.fromPieceId !== pieceId && s.toPieceId !== pieceId
          );
        }),

      duplicatePiece: (projectId, pieceId) => {
        let newId = "";
        get().updateProject(projectId, (p) => {
          const src = p.pieces.find((x) => x.id === pieceId);
          if (!src) return;
          const copy: PatternPiece = JSON.parse(JSON.stringify(src));
          copy.id = uid("pc");
          copy.name = `${src.name} copy`;
          copy.position = { x: src.position.x + 40, y: src.position.y + 40 };
          copy.markings = copy.markings.map((m) => ({ ...m, id: uid("mk") }));
          p.pieces.push(copy);
          newId = copy.id;
        });
        return newId;
      },

      mirrorPiece: (projectId, pieceId, axis) =>
        get().updateProject(projectId, (p) => {
          const piece = p.pieces.find((x) => x.id === pieceId);
          if (!piece) return;
          // Mirror the polygon around its own bounds. Reverse winding so
          // outward normals stay consistent for seam-allowance offset.
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const pt of piece.points) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }
          const mirrored = piece.points
            .map((pt) =>
              axis === "x"
                ? { x: maxX + minX - pt.x, y: pt.y }
                : { x: pt.x, y: maxY + minY - pt.y }
            )
            .reverse();
          piece.points = mirrored;
          // Mirror markings.
          piece.markings = piece.markings.map((m) => {
            if (m.kind === "grain") {
              return {
                ...m,
                position:
                  axis === "x"
                    ? { x: maxX + minX - m.position.x, y: m.position.y }
                    : { x: m.position.x, y: maxY + minY - m.position.y },
                angle: -m.angle,
              };
            }
            if (m.kind === "notch") {
              return {
                ...m,
                position:
                  axis === "x"
                    ? { x: maxX + minX - m.position.x, y: m.position.y }
                    : { x: m.position.x, y: maxY + minY - m.position.y },
              };
            }
            return m;
          });
          // Per-edge SA: reversing the polygon reorders edges; rebuild map.
          if (piece.edgeSeamAllowances) {
            const n = piece.points.length;
            const old = piece.edgeSeamAllowances;
            const next: Record<number, number> = {};
            for (const [k, v] of Object.entries(old)) {
              const oldEdge = Number(k);
              // edge i in the reversed polygon maps to (n - 2 - i) in the original
              const newEdge = (n - 2 - oldEdge + n) % n;
              next[newEdge] = v;
            }
            piece.edgeSeamAllowances = next;
          }
        }),

      updatePiece: (projectId, pieceId, fn) =>
        get().updateProject(projectId, (p) => {
          const piece = p.pieces.find((x) => x.id === pieceId);
          if (piece) fn(piece);
        }),

      addMarking: (projectId, pieceId, marking, options) =>
        get().updateProject(projectId, (p) => {
          const piece = p.pieces.find((x) => x.id === pieceId);
          if (!piece) return;
          if (options?.replaceKind) {
            piece.markings = piece.markings.filter(
              (m) => m.kind !== options.replaceKind
            );
          }
          piece.markings.push({ ...marking, id: uid("mk") } as Marking);
        }),

      addSeam: (projectId, seam) =>
        get().updateProject(projectId, (p) => {
          p.seams.push({ ...seam, id: uid("seam") });
        }),

      removeSeam: (projectId, seamId) =>
        get().updateProject(projectId, (p) => {
          p.seams = p.seams.filter((s) => s.id !== seamId);
        }),
    }),
    { name: "gearpattern-projects" }
  )
);
