import { z } from 'zod';

/**
 * Article Validation Schemas
 * Using Zod for runtime validation of API inputs
 */

// Valid article statuses
export const ArticleStatus = z.enum([
  'Draft',
  'Pending Review',
  'Published',
  'Archived',
]);

export type ArticleStatusType = z.infer<typeof ArticleStatus>;

// Available categories
export const ArticleCategories = [
  'Engineering',
  'Tech',
  'Tutorials',
  'Study Guides',
  'Certification Tips',
  'News',
  'Product',
] as const;

export const ArticleCategory = z.enum(ArticleCategories);

/**
 * Schema for creating a new article
 */
export const articleCreateSchema = z.object({
  // Required fields
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less'),
  body: z
    .string()
    .min(1, 'Content is required'),
  category: z
    .string()
    .min(1, 'Category is required'),

  // Optional fields
  subtitle: z
    .string()
    .max(500, 'Subtitle must be 500 characters or less')
    .optional()
    .nullable(),
  excerpt: z
    .string()
    .max(500, 'Excerpt must be 500 characters or less')
    .optional()
    .nullable(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .max(255)
    .optional()
    .nullable(),
  tags: z
    .array(z.string())
    .default([]),
  headerImageUrl: z
    .string()
    .url('Invalid image URL')
    .optional()
    .nullable(),
  authorName: z
    .string()
    .max(255)
    .optional()
    .nullable(),
  authorId: z
    .string()
    .optional()
    .nullable(),
  status: ArticleStatus.default('Draft'),
  isPublished: z
    .boolean()
    .default(false),
  isFeatured: z
    .boolean()
    .default(false),
  articleDate: z
    .string()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val), {
      message: 'Invalid date format',
    })
    .optional()
    .nullable(),
  readingTime: z
    .number()
    .min(1)
    .optional()
    .nullable(),
  metaTitle: z
    .string()
    .max(255)
    .optional()
    .nullable(),
  metaDescription: z
    .string()
    .max(320)
    .optional()
    .nullable(),
});

export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;

/**
 * Schema for updating an existing article
 * All fields are optional
 */
export const articleUpdateSchema = articleCreateSchema.partial();

export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

/**
 * Schema for article list query parameters
 */
export const articleListQuerySchema = z.object({
  status: ArticleStatus.optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdDate', 'articleDate', 'title', 'viewCount'])
    .default('createdDate'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
});

export type ArticleListQuery = z.infer<typeof articleListQuerySchema>;

/**
 * Validate article create input
 */
export function validateArticleCreate(data: unknown): {
  success: boolean;
  data?: ArticleCreateInput;
  error?: string;
} {
  const result = articleCreateSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: `${firstError.path.join('.')}: ${firstError.message}`,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Validate article update input
 */
export function validateArticleUpdate(data: unknown): {
  success: boolean;
  data?: ArticleUpdateInput;
  error?: string;
} {
  const result = articleUpdateSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: `${firstError.path.join('.')}: ${firstError.message}`,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Validate article list query
 */
export function validateArticleListQuery(params: URLSearchParams): {
  success: boolean;
  data?: ArticleListQuery;
  error?: string;
} {
  const rawData = {
    status: params.get('status') || undefined,
    category: params.get('category') || undefined,
    search: params.get('search') || undefined,
    page: params.get('page') || '1',
    limit: params.get('limit') || '20',
    sortBy: params.get('sortBy') || 'createdDate',
    sortOrder: params.get('sortOrder') || 'desc',
  };

  const result = articleListQuerySchema.safeParse(rawData);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: `${firstError.path.join('.')}: ${firstError.message}`,
    };
  }

  return { success: true, data: result.data };
}
