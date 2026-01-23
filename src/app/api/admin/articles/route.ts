import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSalesforceClient } from '@/lib/salesforce/client';
import { mapArticle } from '@/lib/mappers/article-mapper';
import { mapToSalesforce } from '@/lib/mappers/article-mapper';
import { validateArticleCreate, validateArticleListQuery } from '@/lib/validations/article';
import { invalidateArticleCaches } from '@/lib/cache/redis';
import type { SF_Article__c } from '@/types/salesforce/raw';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Escape single quotes for SOQL to prevent injection
function escapeSOQL(value: string): string {
  return value.replace(/'/g, "\\'");
}

// Fields to retrieve for list view
const ARTICLE_LIST_FIELDS = `
  Id, Name, Heading__c, Subtitle__c, Excerpt__c, Slug__c,
  Header_Image_URL__c, Category__c, Tags__c,
  Article_Date__c, Status__c, Is_Published__c, Is_Featured__c,
  Reading_Time_Minutes__c, View_Count__c, Author_Name__c,
  CreatedDate, LastModifiedDate
`.trim();

/**
 * GET /api/admin/articles
 * List articles with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const validation = validateArticleListQuery(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { status, category, search, page, limit, sortBy, sortOrder } = validation.data!;

    // Build SOQL query
    const conditions: string[] = [];

    if (status) {
      conditions.push(`Status__c = '${status}'`);
    }
    if (category) {
      conditions.push(`Category__c = '${escapeSOQL(category)}'`);
    }
    if (search) {
      // Escape single quotes for SOQL
      const escapedSearch = search.replace(/'/g, "\\'");
      conditions.push(`(Heading__c LIKE '%${escapedSearch}%' OR Excerpt__c LIKE '%${escapedSearch}%')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Map sort field to Salesforce field
    const sortFieldMap: Record<string, string> = {
      createdDate: 'CreatedDate',
      articleDate: 'Article_Date__c',
      title: 'Heading__c',
      viewCount: 'View_Count__c',
    };
    const sortField = sortFieldMap[sortBy] || 'CreatedDate';
    const orderClause = `ORDER BY ${sortField} ${sortOrder.toUpperCase()} NULLS LAST`;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get total count using queryRaw to access totalSize
    const countQuery = `SELECT Id FROM Article__c ${whereClause}`;
    const client = getSalesforceClient();
    const countResult = await client.queryRaw<SF_Article__c>(countQuery);
    const total = countResult.totalSize;

    // Get articles
    const query = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      ${whereClause}
      ${orderClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `.trim();

    const records = await client.query<SF_Article__c>(query);
    const articles = records.map(mapArticle);

    return NextResponse.json({
      success: true,
      articles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + articles.length < total,
      },
    });
  } catch (error: any) {
    console.error('[Admin Articles GET] Error:', error.message, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/articles
 * Create a new article
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateArticleCreate(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const input = validation.data!;

    // Map to Salesforce fields
    const sfData = mapToSalesforce(input);

    // Check for slug uniqueness
    const client = getSalesforceClient();
    const slugValue = String(sfData.Slug__c || '');
    const escapedSlug = escapeSOQL(slugValue);
    const existingSlug = await client.query<SF_Article__c>(
      `SELECT Id FROM Article__c WHERE Slug__c = '${escapedSlug}' LIMIT 1`
    );

    if (existingSlug.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An article with this slug already exists' },
        { status: 409 }
      );
    }

    // Create article in Salesforce
    const articleId = await client.create('Article__c', sfData);

    console.log(`[Admin Articles] Created article: ${articleId}`);

    // Invalidate Redis caches
    await invalidateArticleCaches();

    // Trigger Next.js on-demand revalidation
    revalidatePath('/'); // Homepage shows latest articles
    revalidatePath(`/${sfData.Slug__c}`); // New article page

    // Revalidate category page if category is set
    if (sfData.Category__c) {
      const categorySlug = String(sfData.Category__c).toLowerCase().replace(/\s+/g, '-');
      revalidatePath(`/category/${categorySlug}`);
    }

    // Revalidate article type pages
    if (sfData.Article_Type__c === 'Tutorial') {
      revalidatePath('/tutorials');
    } else if (sfData.Article_Type__c === 'Exercise') {
      revalidatePath('/exercises');
    }

    console.log(`[Admin Articles] Revalidated pages for article: ${sfData.Slug__c}`);

    return NextResponse.json({
      success: true,
      id: articleId,
      slug: sfData.Slug__c,
      message: 'Article created and pages revalidated successfully',
    });
  } catch (error: any) {
    console.error('[Admin Articles POST] Error:', error.message, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create article' },
      { status: 500 }
    );
  }
}
