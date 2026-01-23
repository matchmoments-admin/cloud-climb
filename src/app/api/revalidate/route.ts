import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { invalidateArticleCaches } from '@/lib/cache/redis';

export const runtime = 'nodejs';

/**
 * POST /api/revalidate
 * External webhook endpoint for triggering on-demand ISR revalidation.
 *
 * This can be called by external systems (e.g., Salesforce webhooks)
 * to trigger page regeneration when content changes outside the admin API.
 *
 * Request body:
 * {
 *   "slug": "article-slug",           // Optional: specific article slug to revalidate
 *   "category": "Engineering",        // Optional: category to revalidate
 *   "articleType": "Tutorial",        // Optional: article type (Tutorial, Exercise)
 *   "paths": ["/custom/path"],        // Optional: additional paths to revalidate
 *   "invalidateRedis": true           // Optional: also invalidate Redis cache (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  // Verify secret token for security
  const secret = request.headers.get('x-revalidate-secret');

  if (!process.env.REVALIDATE_SECRET) {
    console.warn('[Revalidate] REVALIDATE_SECRET not configured');
    return NextResponse.json(
      { success: false, error: 'Revalidation not configured' },
      { status: 503 }
    );
  }

  if (secret !== process.env.REVALIDATE_SECRET) {
    console.warn('[Revalidate] Invalid secret provided');
    return NextResponse.json(
      { success: false, error: 'Invalid secret' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      slug,
      category,
      articleType,
      paths = [],
      invalidateRedis = true
    } = body;

    const revalidatedPaths: string[] = [];

    // Always revalidate homepage
    revalidatePath('/');
    revalidatedPaths.push('/');

    // Revalidate specific article page
    if (slug) {
      revalidatePath(`/${slug}`);
      revalidatedPaths.push(`/${slug}`);
    }

    // Revalidate category page
    if (category) {
      const categorySlug = String(category).toLowerCase().replace(/\s+/g, '-');
      revalidatePath(`/category/${categorySlug}`);
      revalidatedPaths.push(`/category/${categorySlug}`);
    }

    // Revalidate article type pages
    if (articleType === 'Tutorial') {
      revalidatePath('/tutorials');
      revalidatedPaths.push('/tutorials');
    } else if (articleType === 'Exercise') {
      revalidatePath('/exercises');
      revalidatedPaths.push('/exercises');
    }

    // Revalidate additional custom paths
    for (const path of paths) {
      if (typeof path === 'string' && path.startsWith('/')) {
        revalidatePath(path);
        revalidatedPaths.push(path);
      }
    }

    // Invalidate Redis cache if requested
    if (invalidateRedis) {
      await invalidateArticleCaches();
    }

    console.log(`[Revalidate] Success - Paths: ${revalidatedPaths.join(', ')}`);

    return NextResponse.json({
      success: true,
      revalidated: true,
      timestamp: Date.now(),
      paths: revalidatedPaths,
      redisInvalidated: invalidateRedis,
    });
  } catch (error: any) {
    console.error('[Revalidate] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Revalidation failed' },
      { status: 500 }
    );
  }
}
