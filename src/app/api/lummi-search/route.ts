import { NextRequest, NextResponse } from 'next/server';
import { searchLummiPhotos, getRandomLummiPhotos } from '@/lib/lummi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/lummi-search
 * Search for stock photos on Lummi.ai
 *
 * Query params:
 * - q: Search query (required unless random=true)
 * - limit: Number of results (default: 12, max: 30)
 * - page: Page number (default: 1)
 * - aspect: Aspect ratio filter (landscape, portrait, square)
 * - random: If true, fetch random images instead of searching
 *
 * Response: { success: true, images: [...], total, page, hasMore }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q')?.trim() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 30);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const aspectRatio = searchParams.get('aspect') as
      | 'landscape'
      | 'portrait'
      | 'square'
      | null;
    const random = searchParams.get('random') === 'true';

    // Check if Lummi API key is configured
    if (!process.env.LUMMI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stock photo search is not configured',
          code: 'NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    // Fetch random images if requested
    if (random) {
      const images = await getRandomLummiPhotos(limit);
      return NextResponse.json({
        success: true,
        images,
        total: images.length,
        page: 1,
        hasMore: false,
      });
    }

    // Require query for search
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search Lummi
    const result = await searchLummiPhotos(query, {
      limit,
      page,
      aspectRatio: aspectRatio || undefined,
    });

    return NextResponse.json({
      success: true,
      images: result.images,
      total: result.total,
      page: result.page,
      hasMore: result.hasMore,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Lummi Search API] Error:', error);

    // Handle specific error types
    if (err.message?.includes('LUMMI_API_KEY')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stock photo search is not configured',
          code: 'NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    if (err.message?.includes('rate limit') || err.message?.includes('429')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please wait a moment.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    if (err.message?.includes('Invalid Lummi API key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stock photo service authentication failed',
          code: 'AUTH_FAILED',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || 'Failed to search photos' },
      { status: 500 }
    );
  }
}
