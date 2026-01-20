// Core data types for MYOG pattern generator

export interface Point {
  x: number;
  y: number;
}

export type ProjectType = 'backpack' | 'pouch' | 'bag' | 'stuff-sack' | 'other';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type PieceShape = 'rectangle' | 'circle' | 'polygon' | 'custom';
export type NotchType = 'single' | 'double';
export type MarkingType = 'fold' | 'placement' | 'dart' | 'pleat';

export interface PatternRequest {
  description: string;
  projectType: ProjectType;
  measurements?: {
    height?: number;
    width?: number;
    depth?: number;
    [key: string]: number | undefined;
  };
  referenceImages?: File[];
  style?: string;
  features?: string[];
  fabricType?: string;
}

export interface PatternPiece {
  id: string;
  name: string;
  cutQuantity: number;

  // Geometry
  shape: PieceShape;
  dimensions: {
    width?: number;
    height?: number;
    radius?: number;
    points?: Point[];
  };

  // Pattern details
  seamAllowance: number;
  grainline?: {
    angle: number;
    position: Point;
  };
  notches?: {
    position: Point;
    type: NotchType;
    label?: string;
  }[];
  markings?: {
    type: MarkingType;
    position: Point;
    label?: string;
  }[];

  // Material info
  fabric: string;
  interfacing?: boolean;

  // Layout info (for PDF export)
  position?: Point;
  rotation?: number;
}

export interface FabricMaterial {
  type: string;
  amount: number;
  notes?: string;
}

export interface Hardware {
  item: string;
  quantity: number;
  length?: string;
  notes?: string;
}

export interface AssemblyStep {
  step: number;
  instruction: string;
  pieces: string[];
  technique: string;
  notes?: string;
}

export interface GeneratedPattern {
  id: string;
  projectInfo: {
    name: string;
    description: string;
    difficulty: DifficultyLevel;
    estimatedTime: string;
  };

  pieces: PatternPiece[];
  materials: {
    fabric: FabricMaterial[];
    thread: string;
    other?: string[];
  };
  hardware: Hardware[];
  assembly: AssemblyStep[];

  metadata: {
    generatedAt: Date;
    aiModel: string;
    tokensUsed?: number;
    prompt?: string;
  };
}

export interface ProjectModifications {
  scaleFactor?: number;
  pieceAdjustments?: {
    [pieceId: string]: {
      position?: Point;
      rotation?: number;
      customSeamAllowance?: number;
    };
  };
}

export interface UserProject {
  id: string;
  name: string;
  input: PatternRequest;
  aiGenerated: GeneratedPattern;
  modifications: ProjectModifications;
  createdAt: Date;
  lastModified: Date;
}
