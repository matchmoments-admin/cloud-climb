import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { generateImage, ImageAspectRatio } from '@/lib/ai/gemini';
import { uploadToR2, generateImageKey } from '@/lib/r2/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Longer timeout for image generation (can take 10-30 seconds)
export const maxDuration = 60;

/**
 * POST /api/generate-image
 * Generate an image using Gemini and upload to R2
 *
 * Request: { prompt: string, aspectRatio?: string }
 * Response: { success: true, url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, aspectRatio = '16:9' } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Prompt must be under 2000 characters' },
        { status: 400 }
      );
    }

    // Validate aspect ratio
    const validAspectRatios = ['1:1', '16:9', '3:2', '4:3', '9:16'];
    if (!validAspectRatios.includes(aspectRatio)) {
      return NextResponse.json(
        { success: false, error: `Invalid aspect ratio. Valid options: ${validAspectRatios.join(', ')}` },
        { status: 400 }
      );
    }

    console.log('[Generate Image API] Generating image...');
    console.log('[Generate Image API] Prompt:', prompt.substring(0, 100));
    console.log('[Generate Image API] Aspect ratio:', aspectRatio);

    // Generate image with Gemini
    const { imageData } = await generateImage(
      prompt,
      aspectRatio as ImageAspectRatio
    );

    // Convert base64 to buffer
    const inputBuffer = Buffer.from(imageData, 'base64');
    console.log('[Generate Image API] Image buffer size:', inputBuffer.length);

    // Optimize with sharp and convert to WebP
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    console.log('[Generate Image API] Image dimensions:', metadata.width, 'x', metadata.height);

    // Resize if too large
    const maxDimension = 2400;
    if (
      metadata.width &&
      metadata.height &&
      (metadata.width > maxDimension || metadata.height > maxDimension)
    ) {
      image.resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP for optimal compression
    const outputBuffer = await image
      .webp({
        quality: 90, // Higher quality for AI-generated images
        effort: 4,
      })
      .toBuffer();

    console.log('[Generate Image API] Optimized size:', outputBuffer.length);

    // Generate unique filename based on prompt
    const slugifiedPrompt = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 40);
    const filename = `generated-${slugifiedPrompt}.webp`;
    const key = generateImageKey(filename, 'generated');

    // Upload to R2
    const url = await uploadToR2(outputBuffer, key, 'image/webp');
    console.log('[Generate Image API] Uploaded to:', url);

    return NextResponse.json({
      success: true,
      url,
      key,
      size: outputBuffer.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Generate Image API] Error:', error);

    // Handle specific error types
    if (err.message?.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured' },
        { status: 503 }
      );
    }

    if (err.message?.includes('rate limit') || err.message?.includes('429')) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    if (err.message?.includes('safety') || err.message?.includes('blocked')) {
      return NextResponse.json(
        { success: false, error: 'Image blocked by safety filters. Try a different prompt.' },
        { status: 400 }
      );
    }

    if (err.message?.includes('Missing R2 environment variables')) {
      return NextResponse.json(
        { success: false, error: 'Image storage is not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
