import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSalesforceClient } from '@/lib/salesforce/client';
import { mapArticle, mapToSalesforceUpdate } from '@/lib/mappers/article-mapper';
import { validateArticleUpdate } from '@/lib/validations/article';
import { invalidateArticleCaches } from '@/lib/cache/redis';
import { deleteFromR2, extractKeyFromUrl } from '@/lib/r2/client';
import type { SF_Article__c } from '@/types/salesforce/raw';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Full fields for editing
const ARTICLE_FULL_FIELDS = `
  Id, Name, Heading__c, Subtitle__c, Body__c, Content__c, Excerpt__c, Slug__c,
  Header_Image_URL__c, Category__c, Tags__c,
  Article_Date__c, Status__c, Is_Published__c, Is_Featured__c,
  Reading_Time_Minutes__c, View_Count__c, Author_Name__c, Author__c,
  Meta_Title__c, Meta_Description__c,
  CreatedDate, LastModifiedDate
`.trim();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/articles/[id]
 * Get a single article by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const client = getSalesforceClient();
    const query = `
      SELECT ${ARTICLE_FULL_FIELDS}
      FROM Article__c
      WHERE Id = '${id}'
      LIMIT 1
    `.trim();

    const records = await client.query<SF_Article__c>(query);

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    const article = mapArticle(records[0]);

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error: any) {
    console.error('[Admin Article GET] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/articles/[id]
 * Update an existing article
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateArticleUpdate(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const input = validation.data!;

    // Check if article exists and get current data for revalidation
    const client = getSalesforceClient();
    const existingQuery = `SELECT Id, Slug__c, Category__c, Article_Type__c FROM Article__c WHERE Id = '${id}' LIMIT 1`;
    const existing = await client.query<SF_Article__c>(existingQuery);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    const oldArticle = existing[0];
    const oldSlug = oldArticle.Slug__c;
    const oldCategory = oldArticle.Category__c;
    const oldArticleType = oldArticle.Article_Type__c;

    // If slug is being changed, check uniqueness
    if (input.slug && input.slug !== oldSlug) {
      const slugCheck = await client.query<SF_Article__c>(
        `SELECT Id FROM Article__c WHERE Slug__c = '${input.slug}' AND Id != '${id}' LIMIT 1`
      );

      if (slugCheck.length > 0) {
        return NextResponse.json(
          { success: false, error: 'An article with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Map to Salesforce fields (only changed fields)
    const sfData = mapToSalesforceUpdate(input);

    // Update in Salesforce
    await client.update('Article__c', id, sfData);

    console.log(`[Admin Article] Updated article: ${id}`);

    // Invalidate Redis caches
    await invalidateArticleCaches();

    // Trigger Next.js on-demand revalidation
    revalidatePath('/'); // Homepage

    // Revalidate old slug URL if slug changed
    if (oldSlug) {
      revalidatePath(`/${oldSlug}`);
    }

    // Revalidate new/current slug URL
    const currentSlug = input.slug || oldSlug;
    if (currentSlug) {
      revalidatePath(`/${currentSlug}`);
    }

    // Revalidate category pages (old and new if changed)
    if (oldCategory) {
      const oldCategorySlug = String(oldCategory).toLowerCase().replace(/\s+/g, '-');
      revalidatePath(`/category/${oldCategorySlug}`);
    }
    if (input.category && input.category !== oldCategory) {
      const newCategorySlug = input.category.toLowerCase().replace(/\s+/g, '-');
      revalidatePath(`/category/${newCategorySlug}`);
    }

    // Revalidate article type pages (article type is immutable, use existing value)
    if (oldArticleType === 'Tutorial') {
      revalidatePath('/tutorials');
    } else if (oldArticleType === 'Exercise') {
      revalidatePath('/exercises');
    }

    console.log(`[Admin Article] Revalidated pages for article: ${id}`);

    return NextResponse.json({
      success: true,
      id,
      message: 'Article updated and pages revalidated successfully',
    });
  } catch (error: any) {
    console.error('[Admin Article PATCH] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/articles/[id]
 * Delete an article
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const client = getSalesforceClient();

    // Get article data for cleanup and revalidation
    const query = `SELECT Id, Slug__c, Category__c, Article_Type__c, Header_Image_URL__c, Body__c FROM Article__c WHERE Id = '${id}' LIMIT 1`;
    const records = await client.query<SF_Article__c>(query);

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    const article = records[0];
    const { Slug__c: slug, Category__c: category, Article_Type__c: articleType } = article;

    // Delete article from Salesforce
    await client.delete('Article__c', id);

    console.log(`[Admin Article] Deleted article: ${id}`);

    // Attempt to delete header image from R2 if it's our image
    if (article.Header_Image_URL__c) {
      const key = extractKeyFromUrl(article.Header_Image_URL__c);
      if (key) {
        try {
          await deleteFromR2(key);
          console.log(`[Admin Article] Deleted header image: ${key}`);
        } catch (r2Error) {
          console.warn(`[Admin Article] Failed to delete header image: ${key}`, r2Error);
          // Don't fail the request if R2 deletion fails
        }
      }
    }

    // TODO: Extract and delete inline images from Body__c
    // This would require parsing the HTML and extracting image URLs

    // Invalidate Redis caches
    await invalidateArticleCaches();

    // Trigger Next.js on-demand revalidation
    revalidatePath('/'); // Homepage

    // Revalidate the deleted article's page (will now 404)
    if (slug) {
      revalidatePath(`/${slug}`);
    }

    // Revalidate category page
    if (category) {
      const categorySlug = String(category).toLowerCase().replace(/\s+/g, '-');
      revalidatePath(`/category/${categorySlug}`);
    }

    // Revalidate article type pages
    if (articleType === 'Tutorial') {
      revalidatePath('/tutorials');
    } else if (articleType === 'Exercise') {
      revalidatePath('/exercises');
    }

    console.log(`[Admin Article] Revalidated pages after deleting article: ${id}`);

    return NextResponse.json({
      success: true,
      id,
      message: 'Article deleted and pages revalidated successfully',
    });
  } catch (error: any) {
    console.error('[Admin Article DELETE] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
