export type ProcessStatus = 'idle' | 'processing' | 'completed' | 'error';

export type SupportedAspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  resultUrl: string | null;
  aspectRatio: SupportedAspectRatio;
  status: ProcessStatus;
  error?: string | null;
  seoKeywords?: string;
  processingTimeMs?: number;
}

export type PlacementAnchor = 'center' | 'left' | 'right' | 'custom';
export type ScaleDepth = 'hero' | 'natural' | 'accent';
export type PerformanceSpeed = 'turbo' | 'studio' | 'ultra';

export interface InsertionSettings {
  anchor: PlacementAnchor;
  customPoint?: { x: number; y: number }; // percentages 0-100
  scaleDepth: ScaleDepth;
  performanceSpeed: PerformanceSpeed;
  lockGroundShadows: boolean;
  matchLighting: boolean;
  preserveTexture: boolean;
  customPromptDetails?: string;
}

export interface ReferenceScene {
  id: string;
  title: string;
  previewUrl: string;
  base64?: string;
  file?: File;
  isPreset?: boolean;
  description?: string;
  suggestedAnchor?: { x: number; y: number };
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
}

export interface ImagePreview {
  file: File;
  previewUrl: string;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio: AIStudio;
  }
}