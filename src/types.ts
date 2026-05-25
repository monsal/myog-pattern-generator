// All coordinates and dimensions are in millimeters (real world).
// Pixels are display only.

export type Point = { x: number; y: number };

export type GearType =
  | "backpack"
  | "stuff-sack"
  | "hip-pack"
  | "frame-bag"
  | "pouch"
  | "other";

export type SeamStatus = "ok" | "warn" | "bad" | "unconnected";

export type Material = {
  id: string;
  name: string;
  weight: number; // g/m²
  color: string; // hex
  stretch?: boolean;
  waterproof?: boolean;
  notes?: string;
};

export type Marking =
  | { id: string; kind: "grain"; angle: number; position: Point }
  | { id: string; kind: "notch"; position: Point; double?: boolean }
  | { id: string; kind: "fold"; from: Point; to: Point };

export type SeamConnection = {
  id: string;
  fromPieceId: string;
  fromEdge: number;
  toPieceId: string;
  toEdge: number;
  flipped?: boolean;
};

export type PatternPiece = {
  id: string;
  name: string;
  // Local polygon in mm, around origin (translated by position)
  points: Point[];
  position: Point; // top-left placement in mm
  rotation: number; // degrees
  seamAllowance: number; // mm, uniform
  edgeSeamAllowances?: Record<number, number>; // optional per-edge override
  cutQuantity: number;
  materialId?: string;
  markings: Marking[];
  aiGenerated?: boolean;
  confidence?: number;
};

export type InstructionStep = {
  id: string;
  title: string;
  body: string;
  pieceIds: string[];
};

export type Project = {
  id: string;
  name: string;
  description: string;
  gearType: GearType;
  createdAt: number;
  updatedAt: number;
  version: number;
  pieces: PatternPiece[];
  materials: Material[];
  seams: SeamConnection[];
  steps: InstructionStep[];
  print: {
    paper: "A4" | "A3";
    overlapMm: number;
    orientation: "portrait" | "landscape";
  };
};

export const DEFAULT_MATERIALS: Material[] = [
  { id: "m-vx07", name: "X-Pac VX07", weight: 135, color: "#5B7FA6" },
  { id: "m-vx21", name: "X-Pac VX21", weight: 200, color: "#3D6B8F" },
  { id: "m-dcf05", name: "Dyneema DCF 0.51oz", weight: 17, color: "#E8E2D5" },
  { id: "m-dcf10", name: "Dyneema DCF 1.0oz", weight: 34, color: "#D6D3D1" },
  { id: "m-cord500", name: "Cordura 500D", weight: 175, color: "#6B9E7A" },
  { id: "m-cord1000", name: "Cordura 1000D", weight: 305, color: "#3D5A4A" },
  { id: "m-hex70", name: "HEX70", weight: 70, color: "#C07A50" },
  { id: "m-rs70", name: "Ripstop nylon 70D", weight: 70, color: "#C4A83C" },
];
