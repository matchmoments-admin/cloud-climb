/**
 * Image Provider Types
 *
 * Unified types for image generation (Gemini) and stock photos (Lummi).
 */

// ============================================================================
// TYPES
// ============================================================================

export type ImageAspectRatio = '1:1' | '16:9' | '3:2' | '4:3' | '9:16';

// ============================================================================
// INTERFACES
// ============================================================================

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: ImageAspectRatio;
}

export interface GenerateImageResult {
  imageData: string; // base64 encoded
  mimeType: string;
}

/**
 * Stock photo result with attribution info
 */
export interface StockPhotoResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  attribution: {
    authorName: string;
    authorUrl: string;
    imageUrl: string;
    source: string;
  };
}
