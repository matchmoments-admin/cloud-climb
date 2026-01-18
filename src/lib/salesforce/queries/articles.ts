/**
 * Article Query Functions for Cloud Climb
 *
 * Salesforce queries for Article__c with caching.
 * Uses fields confirmed to exist in the Salesforce schema.
 */

import { getSalesforceClient } from '../client';
import { getCached } from '@/lib/cache/redis';
import { CacheKeys, CacheStrategy } from '@/lib/cache/strategies';
import { mapArticle, mapArticles } from '@/lib/mappers/article-mapper';
import type { SF_Article__c } from '@/types/salesforce/raw';
import type { Article } from '@/types/domain';

// Article fields - Full field list with permission sets now assigned
const ARTICLE_FIELDS = `
  Id,
  Name,
  Heading__c,
  Subtitle__c,
  Body__c,
  Content__c,
  Excerpt__c,
  Slug__c,
  Article_Date__c,
  Publish_Date__c,
  Status__c,
  Is_Published__c,
  Is_Featured__c,
  Is_Premium__c,
  Article_Type__c,
  Category__c,
  Tags__c,
  Author_Name__c,
  Source__c,
  Header_Image_URL__c,
  Article_URL__c,
  Meta_Title__c,
  Reading_Time__c,
  Reading_Time_Minutes__c,
  Word_Count__c,
  View_Count__c,
  External_ID__c,
  Author__c,
  Author__r.Id,
  Author__r.FirstName,
  Author__r.LastName,
  Author__r.Email,
  Author__r.Title,
  Certification__c,
  Certification__r.Id,
  Certification__r.Name,
  Topic__c,
  Topic__r.Id,
  Topic__r.Name,
  CreatedDate,
  LastModifiedDate
`.trim();

// Minimal fields for listing pages (faster queries)
const ARTICLE_LIST_FIELDS = `
  Id,
  Name,
  Heading__c,
  Subtitle__c,
  Excerpt__c,
  Slug__c,
  Article_Date__c,
  Status__c,
  Is_Published__c,
  Is_Featured__c,
  Category__c,
  Tags__c,
  Author_Name__c,
  Header_Image_URL__c,
  Reading_Time__c,
  View_Count__c,
  Author__c,
  Author__r.Id,
  Author__r.FirstName,
  Author__r.LastName,
  Certification__c,
  Certification__r.Name,
  Topic__c,
  Topic__r.Name
`.trim();

export interface ArticleFilters {
  category?: string;
  certification?: string;
  topic?: string;
  author?: string;
  tag?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get all published articles
 */
export async function getArticles(filters: ArticleFilters = {}): Promise<Article[]> {
  const cacheKey = `${CacheKeys.ARTICLES_ALL}:${JSON.stringify(filters)}`;

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();
    const conditions: string[] = [];

    // Default to published articles
    if (filters.isPublished !== false) {
      conditions.push('Is_Published__c = true');
    }

    if (filters.status) {
      conditions.push(`Status__c = '${filters.status}'`);
    }

    if (filters.category) {
      conditions.push(`Category__c = '${filters.category}'`);
    }

    if (filters.certification) {
      conditions.push(`Certification__c = '${filters.certification}'`);
    }

    if (filters.topic) {
      conditions.push(`Topic__c = '${filters.topic}'`);
    }

    if (filters.author) {
      conditions.push(`Author__c = '${filters.author}'`);
    }

    if (filters.tag) {
      conditions.push(`Tags__c LIKE '%${filters.tag}%'`);
    }

    if (filters.isFeatured !== undefined) {
      conditions.push(`Is_Featured__c = ${filters.isFeatured}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filters.limit ? `LIMIT ${filters.limit}` : 'LIMIT 100';
    const offsetClause = filters.offset ? `OFFSET ${filters.offset}` : '';

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      ${whereClause}
      ORDER BY Article_Date__c DESC NULLS LAST, CreatedDate DESC
      ${limitClause}
      ${offsetClause}
    `.trim();

    console.log('[Articles] Executing SOQL:', soql.substring(0, 200) + '...');

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.articlesAll);
}

/**
 * Get article by slug
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const cacheKey = CacheKeys.ARTICLE_BY_SLUG(slug);

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_FIELDS}
      FROM Article__c
      WHERE Slug__c = '${slug}'
      AND Is_Published__c = true
      LIMIT 1
    `.trim();

    const records = await client.query<SF_Article__c>(soql);

    if (records.length === 0) {
      return null;
    }

    return mapArticle(records[0]);
  }, CacheStrategy.articleBySlug);
}

/**
 * Get article by ID
 */
export async function getArticleById(id: string): Promise<Article | null> {
  const cacheKey = CacheKeys.ARTICLE_BY_ID(id);

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_FIELDS}
      FROM Article__c
      WHERE Id = '${id}'
      LIMIT 1
    `.trim();

    const records = await client.query<SF_Article__c>(soql);

    if (records.length === 0) {
      return null;
    }

    return mapArticle(records[0]);
  }, CacheStrategy.articleBySlug);
}

/**
 * Get featured articles
 */
export async function getFeaturedArticles(limit: number = 3): Promise<Article[]> {
  const cacheKey = CacheKeys.ARTICLES_FEATURED;

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      AND Is_Featured__c = true
      ORDER BY Article_Date__c DESC NULLS LAST
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.articlesFeatured);
}

/**
 * Get latest articles
 */
export async function getLatestArticles(limit: number = 10): Promise<Article[]> {
  const cacheKey = CacheKeys.ARTICLES_LATEST;

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      ORDER BY Article_Date__c DESC NULLS LAST, CreatedDate DESC
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.articlesLatest);
}

/**
 * Get articles by category
 */
export async function getArticlesByCategory(category: string, limit: number = 20): Promise<Article[]> {
  const cacheKey = CacheKeys.ARTICLES_BY_CATEGORY(category);

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      AND Category__c = '${category}'
      ORDER BY Article_Date__c DESC NULLS LAST
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.articlesByCategory);
}

/**
 * Get articles by certification
 */
export async function getArticlesByCertification(certificationId: string, limit: number = 20): Promise<Article[]> {
  const cacheKey = `articles:certification:${certificationId}`;

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      AND Certification__c = '${certificationId}'
      ORDER BY Article_Date__c DESC NULLS LAST
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.articlesByCategory);
}

/**
 * Get articles by topic
 */
export async function getArticlesByTopic(topicId: string, limit: number = 20): Promise<Article[]> {
  const cacheKey = `articles:topic:${topicId}`;

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      AND Topic__c = '${topicId}'
      ORDER BY Article_Date__c DESC NULLS LAST
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.articlesByCategory);
}

/**
 * Get articles by author
 */
export async function getArticlesByAuthor(authorId: string, limit: number = 20): Promise<Article[]> {
  const cacheKey = CacheKeys.ARTICLES_BY_AUTHOR(authorId);

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      AND Author__c = '${authorId}'
      ORDER BY Article_Date__c DESC NULLS LAST
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.articlesByAuthor);
}

/**
 * Get related articles (same category or certification, excluding current)
 */
export async function getRelatedArticles(article: Article, limit: number = 3): Promise<Article[]> {
  const cacheKey = CacheKeys.ARTICLES_RELATED(article.id);

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    // Try to find articles in same category
    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      AND Id != '${article.id}'
      AND Category__c = '${article.category}'
      ORDER BY Article_Date__c DESC NULLS LAST
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.articlesRelated);
}

/**
 * Search articles using SOSL
 */
export async function searchArticles(query: string, limit: number = 20): Promise<Article[]> {
  const cacheKey = CacheKeys.ARTICLES_SEARCH(query);

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    // Escape special SOSL characters
    const escapedQuery = query.replace(/[?&|!{}[\]()^~*:\\"'+\-]/g, '\\$&');

    const sosl = `
      FIND {${escapedQuery}} IN ALL FIELDS
      RETURNING Article__c(
        ${ARTICLE_LIST_FIELDS}
        WHERE Is_Published__c = true
        ORDER BY Article_Date__c DESC
        LIMIT ${limit}
      )
    `.trim();

    const records = await client.search<SF_Article__c>(sosl);
    return mapArticles(records);
  }, CacheStrategy.articlesSearch);
}

/**
 * Get all unique categories from published articles
 */
export async function getCategories(): Promise<string[]> {
  const cacheKey = CacheKeys.CATEGORIES_ALL;

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    // Get distinct categories by querying articles
    const soql = `
      SELECT Category__c
      FROM Article__c
      WHERE Is_Published__c = true
      AND Category__c != null
      ORDER BY Category__c ASC
      LIMIT 200
    `.trim();

    const records = await client.query<SF_Article__c>(soql);

    // Get unique categories
    const categories = [...new Set(records.map(r => r.Category__c).filter((c): c is string => !!c))];
    return categories;
  }, CacheStrategy.categoriesAll);
}

/**
 * Get all certifications with articles
 */
export async function getCertifications(): Promise<Array<{ id: string; name: string; code: string }>> {
  const cacheKey = 'certifications:all';

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT Id, Name, Certification_Code__c, Description__c
      FROM Certification__c
      WHERE Is_Active__c = true
      ORDER BY Name ASC
    `.trim();

    const records = await client.query<{
      Id: string;
      Name: string;
      Certification_Code__c?: string;
      Description__c?: string;
    }>(soql);

    return records.map(r => ({
      id: r.Id,
      name: r.Name || '',
      code: r.Certification_Code__c || '',
    }));
  }, CacheStrategy.categoriesAll);
}

// =============================================================================
// Tutorial Queries (Article_Type__c = 'Tutorial')
// =============================================================================

/**
 * Get all published tutorials
 */
export async function getTutorials(limit: number = 50): Promise<Article[]> {
  const cacheKey = CacheKeys.TUTORIALS_ALL;

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      AND Article_Type__c = 'Tutorial'
      ORDER BY Article_Date__c DESC NULLS LAST, CreatedDate DESC
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.tutorialsAll);
}

/**
 * Get tutorial by slug with full content
 */
export async function getTutorialBySlug(slug: string): Promise<Article | null> {
  const cacheKey = CacheKeys.TUTORIAL_BY_SLUG(slug);

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_FIELDS}
      FROM Article__c
      WHERE Slug__c = '${slug}'
      AND Is_Published__c = true
      AND Article_Type__c = 'Tutorial'
      LIMIT 1
    `.trim();

    const records = await client.query<SF_Article__c>(soql);

    if (records.length === 0) {
      return null;
    }

    return mapArticle(records[0]);
  }, CacheStrategy.tutorialBySlug);
}

// =============================================================================
// Exercise Queries (Article_Type__c = 'Exercise')
// =============================================================================

// Extended fields for exercises (includes starter code, solution, instructions)
const EXERCISE_FIELDS = `
  ${ARTICLE_FIELDS},
  Starter_Code__c,
  Solution_Code__c,
  Instructions__c
`.trim();

/**
 * Get all published exercises
 */
export async function getExercises(limit: number = 50): Promise<Article[]> {
  const cacheKey = CacheKeys.EXERCISES_ALL;

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${ARTICLE_LIST_FIELDS}
      FROM Article__c
      WHERE Is_Published__c = true
      AND Article_Type__c = 'Exercise'
      ORDER BY Article_Date__c DESC NULLS LAST, CreatedDate DESC
      LIMIT ${limit}
    `.trim();

    const records = await client.query<SF_Article__c>(soql);
    return mapArticles(records);
  }, CacheStrategy.exercisesAll);
}

/**
 * Get exercise by slug with full content including code
 */
export async function getExerciseBySlug(slug: string): Promise<Article | null> {
  const cacheKey = CacheKeys.EXERCISE_BY_SLUG(slug);

  return getCached(cacheKey, async () => {
    const client = getSalesforceClient();

    const soql = `
      SELECT ${EXERCISE_FIELDS}
      FROM Article__c
      WHERE Slug__c = '${slug}'
      AND Is_Published__c = true
      AND Article_Type__c = 'Exercise'
      LIMIT 1
    `.trim();

    const records = await client.query<SF_Article__c>(soql);

    if (records.length === 0) {
      return null;
    }

    return mapArticle(records[0]);
  }, CacheStrategy.exerciseBySlug);
}
