/**
 * Article Mapper
 *
 * Transforms Salesforce Article__c records to domain Article type.
 */

import type { SF_Article__c, SF_Contact, SF_Article__c_Extended } from '@/types/salesforce/raw';
import type { Article, Author, ArticleType } from '@/types/domain';
import { parseTags, calculateReadingTime } from '@/lib/utils';

const DEFAULT_AVATAR = '/images/default-avatar.svg';
const DEFAULT_IMAGE = '/images/default-article.svg';

/**
 * Generate a URL-friendly slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

/**
 * Map Salesforce Contact to Author
 */
export function mapAuthor(sf: SF_Contact | undefined, authorName?: string): Author {
  if (!sf) {
    // Use Author_Name__c as fallback when no related Contact
    const name = authorName || 'Unknown Author';
    return {
      id: '',
      name,
      firstName: '',
      lastName: '',
      avatar: DEFAULT_AVATAR,
      bio: '',
      role: 'Author',
      slug: generateSlug(name),
    };
  }

  const firstName = sf.FirstName || '';
  const lastName = sf.LastName || '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || sf.Name || 'Unknown';

  return {
    id: sf.Id,
    name,
    firstName,
    lastName,
    avatar: sf.Profile_Image_URL__c || DEFAULT_AVATAR,
    bio: sf.Description || '',
    role: sf.Title || 'Author',
    slug: generateSlug(name) || sf.Id,
    email: sf.Email,
  };
}

/**
 * Cast article type from Salesforce string to domain type
 */
function castArticleType(type?: string): ArticleType | undefined {
  const validTypes: ArticleType[] = ['Blog_Post', 'Tutorial', 'Exercise'];
  return validTypes.includes(type as ArticleType) ? (type as ArticleType) : undefined;
}

/**
 * Map Salesforce Article__c to Article
 */
export function mapArticle(sf: SF_Article__c | SF_Article__c_Extended): Article {
  const body = sf.Body__c || sf.Content__c || '';
  const title = sf.Heading__c || sf.Name || 'Untitled';
  const readTime = sf.Reading_Time__c || sf.Reading_Time_Minutes__c || calculateReadingTime(body);

  // Cast to extended type to access exercise fields if present
  const extSf = sf as SF_Article__c_Extended;

  return {
    id: sf.Id,
    title,
    slug: sf.Slug__c || generateSlug(title) || sf.Id,
    subtitle: sf.Subtitle__c,
    body,
    excerpt: sf.Excerpt__c || extractExcerpt(body),
    featuredImage: sf.Header_Image_URL__c || DEFAULT_IMAGE,
    category: sf.Category__c || 'General',
    tags: parseTags(sf.Tags__c),
    author: mapAuthor(sf.Author__r, sf.Author_Name__c),
    publishedDate: sf.Article_Date__c ? new Date(sf.Article_Date__c) : new Date(),
    readTime,
    viewCount: sf.View_Count__c || 0,
    isFeatured: sf.Is_Featured__c || false,
    isPremium: sf.Is_Premium__c || false,
    metaTitle: sf.Meta_Title__c,
    articleType: castArticleType(sf.Article_Type__c),
    certification: sf.Certification__r ? {
      id: sf.Certification__r.Id,
      name: sf.Certification__r.Name || '',
      code: '',
    } : undefined,
    topic: sf.Topic__r ? {
      id: sf.Topic__r.Id,
      name: sf.Topic__r.Name || '',
      code: '',
    } : undefined,
    // Exercise-specific fields
    starterCode: extSf.Starter_Code__c,
    solutionCode: extSf.Solution_Code__c,
    instructions: extSf.Instructions__c,
  };
}

/**
 * Map array of Salesforce articles
 */
export function mapArticles(sfArticles: SF_Article__c[]): Article[] {
  return sfArticles.map(mapArticle);
}

/**
 * Extract excerpt from body content
 */
function extractExcerpt(body: string, maxLength: number = 160): string {
  // Remove HTML tags
  const text = body.replace(/<[^>]*>/g, '');
  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trim() + '...';
}

// =============================================================================
// Reverse Mapping: Domain Input → Salesforce
// =============================================================================

import type { ArticleCreateInput, ArticleUpdateInput } from '@/lib/validations/article';

/**
 * Input type for creating/updating articles
 */
export interface ArticleInput {
  title: string;
  subtitle?: string | null;
  body: string;
  excerpt?: string | null;
  slug?: string | null;
  category: string;
  tags: string[];
  headerImageUrl?: string | null;
  authorName?: string | null;
  authorId?: string | null;
  status: string;
  isPublished: boolean;
  isFeatured: boolean;
  articleDate?: string | null;
  readingTime?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/**
 * Map domain input to Salesforce Article__c fields for creation
 */
export function mapToSalesforce(input: ArticleCreateInput): Record<string, unknown> {
  const body = input.body || '';

  return {
    Heading__c: input.title,
    Subtitle__c: input.subtitle || null,
    Body__c: body,
    Excerpt__c: input.excerpt || extractExcerpt(body),
    Slug__c: input.slug || generateSlug(input.title),
    Category__c: input.category,
    Tags__c: input.tags.length > 0 ? input.tags.join(', ') : null,
    Header_Image_URL__c: input.headerImageUrl || null,
    Author_Name__c: input.authorName || null,
    Author__c: input.authorId || null,
    Status__c: input.status || 'Draft',
    Is_Published__c: input.isPublished ?? false,
    Is_Featured__c: input.isFeatured ?? false,
    Article_Date__c: input.articleDate
      ? new Date(input.articleDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    Reading_Time_Minutes__c: input.readingTime || calculateReadingTime(body),
    Meta_Title__c: input.metaTitle || null,
    Meta_Description__c: input.metaDescription || null,
  };
}

/**
 * Map domain input to Salesforce Article__c fields for update
 * Only includes fields that are explicitly set
 */
export function mapToSalesforceUpdate(input: ArticleUpdateInput): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (input.title !== undefined) {
    result.Heading__c = input.title;
    // Auto-generate slug if title changed but slug not provided
    if (input.slug === undefined && input.title) {
      result.Slug__c = generateSlug(input.title);
    }
  }
  if (input.subtitle !== undefined) result.Subtitle__c = input.subtitle || null;
  if (input.body !== undefined) {
    result.Body__c = input.body;
    // Recalculate excerpt and reading time if body changed
    if (input.excerpt === undefined) {
      result.Excerpt__c = extractExcerpt(input.body || '');
    }
    if (input.readingTime === undefined) {
      result.Reading_Time_Minutes__c = calculateReadingTime(input.body || '');
    }
  }
  if (input.excerpt !== undefined) result.Excerpt__c = input.excerpt || null;
  if (input.slug !== undefined) result.Slug__c = input.slug || null;
  if (input.category !== undefined) result.Category__c = input.category;
  if (input.tags !== undefined) {
    result.Tags__c = input.tags.length > 0 ? input.tags.join(', ') : null;
  }
  if (input.headerImageUrl !== undefined) result.Header_Image_URL__c = input.headerImageUrl || null;
  if (input.authorName !== undefined) result.Author_Name__c = input.authorName || null;
  if (input.authorId !== undefined) result.Author__c = input.authorId || null;
  if (input.status !== undefined) result.Status__c = input.status;
  if (input.isPublished !== undefined) result.Is_Published__c = input.isPublished;
  if (input.isFeatured !== undefined) result.Is_Featured__c = input.isFeatured;
  if (input.articleDate !== undefined) {
    result.Article_Date__c = input.articleDate
      ? new Date(input.articleDate).toISOString().split('T')[0]
      : null;
  }
  if (input.readingTime !== undefined) result.Reading_Time_Minutes__c = input.readingTime || null;
  if (input.metaTitle !== undefined) result.Meta_Title__c = input.metaTitle || null;
  if (input.metaDescription !== undefined) result.Meta_Description__c = input.metaDescription || null;

  return result;
}
