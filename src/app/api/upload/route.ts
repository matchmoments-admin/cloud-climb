import { NextRequest, NextResponse } from 'next/server';
import {
  uploadToR2,
  generateImageKey,
  validateImageFile,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/r2/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Upload an image to Cloudflare R2
 *
 * Request: FormData with 'file' field
 * Response: { success: true, url: string, key: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type and size
    const validation = validateImageFile(file.size, file.type);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique storage key
    const key = generateImageKey(file.name);

    // Upload to R2
    const url = await uploadToR2(buffer, key, file.type);

    return NextResponse.json({
      success: true,
      url,
      key,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (error: any) {
    console.error('[Upload API] Error:', error);

    // Check for R2 configuration errors
    if (error.message?.includes('Missing R2 environment variables')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Image upload is not configured. Please set up Cloudflare R2.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 * Return upload configuration info
 */
export async function GET() {
  return NextResponse.json({
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
  });
}
