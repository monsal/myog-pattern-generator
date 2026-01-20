// API request and response types

import type { PatternRequest, GeneratedPattern } from './pattern';

export interface GeneratePatternRequest {
  request: PatternRequest;
}

export interface GeneratePatternResponse {
  success: boolean;
  pattern?: GeneratedPattern;
  error?: string;
}

export interface AnalyzeImageRequest {
  image: string; // Base64 encoded image
}

export interface AnalyzeImageResponse {
  success: boolean;
  analysis?: {
    projectType: string;
    estimatedDimensions?: {
      height?: number;
      width?: number;
      depth?: number;
    };
    features: string[];
    style?: string;
    construction?: string;
    details?: string;
  };
  error?: string;
}
