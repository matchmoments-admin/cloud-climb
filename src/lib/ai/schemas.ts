/**
 * AI Content Generation Schemas
 *
 * Uses Zod for runtime validation and manual JSON Schema for Gemini API
 * Zod v4 is not compatible with zod-to-json-schema, so we define JSON schemas manually
 */

import { z } from 'zod';
import type { ContentType } from './system-prompts';

// ============================================================================
// ZOD SCHEMAS - For runtime validation
// ============================================================================

export const blogSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required'),

  slug: z
    .string()
    .min(1, 'Slug is required'),

  excerpt: z
    .string()
    .min(1, 'Excerpt is required'),

  body: z
    .string()
    .min(100, 'Body must be at least 100 characters'),

  category: z.string(),

  readingTime: z
    .number()
    .int()
    .positive(),

  sources: z.array(
    z.object({
      title: z.string().min(1),
      url: z.string(),
    })
  ),
});

export const exerciseSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required'),

  slug: z
    .string()
    .min(1, 'Slug is required'),

  excerpt: z
    .string()
    .min(1, 'Excerpt is required'),

  body: z
    .string()
    .min(50, 'Body must describe the problem'),

  starterCode: z.string(),

  solutionCode: z.string(),

  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),

  sources: z.array(
    z.object({
      title: z.string().min(1),
      url: z.string(),
    })
  ),
});

export const questionSchema = z.object({
  questionText: z
    .string()
    .min(1, 'Question text is required'),

  options: z
    .array(z.string())
    .length(4, 'Must have exactly 4 options'),

  correctAnswer: z
    .number()
    .int()
    .min(0)
    .max(3),

  explanation: z
    .string()
    .min(1, 'Explanation is required'),

  sources: z.array(
    z.object({
      title: z.string().min(1),
      url: z.string(),
    })
  ),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GeneratedBlogContent = z.infer<typeof blogSchema>;
export type GeneratedExerciseContent = z.infer<typeof exerciseSchema>;
export type GeneratedQuestionContent = z.infer<typeof questionSchema>;
export type GeneratedContent =
  | GeneratedBlogContent
  | GeneratedExerciseContent
  | GeneratedQuestionContent;

// ============================================================================
// JSON SCHEMAS FOR GEMINI API - Manually defined for compatibility
// ============================================================================

const blogJsonSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Compelling blog post title',
    },
    slug: {
      type: 'string',
      description: 'URL-friendly slug (lowercase, hyphens, no spaces)',
    },
    excerpt: {
      type: 'string',
      description: 'A 2-3 sentence summary of the article for preview cards',
    },
    body: {
      type: 'string',
      description: 'Full markdown content with ## headings, code blocks, and formatting',
    },
    category: {
      type: 'string',
      description: 'One of: Engineering, Tech, Tutorials, Study Guides, Certification Tips, News, Product',
    },
    readingTime: {
      type: 'integer',
      description: 'Estimated reading time in minutes',
    },
    sources: {
      type: 'array',
      description: 'Reference sources used in the article',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Source name or title' },
          url: { type: 'string', description: 'URL to the source' },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['title', 'slug', 'excerpt', 'body', 'category', 'readingTime', 'sources'],
};

const exerciseJsonSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Exercise title',
    },
    slug: {
      type: 'string',
      description: 'URL-friendly slug',
    },
    excerpt: {
      type: 'string',
      description: 'Brief description of what this exercise teaches',
    },
    body: {
      type: 'string',
      description: 'Full markdown description of the problem with examples',
    },
    starterCode: {
      type: 'string',
      description: 'JavaScript/TypeScript starter code with helpful comments',
    },
    solutionCode: {
      type: 'string',
      description: 'Complete working solution code',
    },
    difficulty: {
      type: 'string',
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      description: 'Difficulty level of the exercise',
    },
    sources: {
      type: 'array',
      description: 'Reference documentation sources',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['title', 'slug', 'excerpt', 'body', 'starterCode', 'solutionCode', 'difficulty', 'sources'],
};

const questionJsonSchema = {
  type: 'object',
  properties: {
    questionText: {
      type: 'string',
      description: 'The full question text',
    },
    options: {
      type: 'array',
      description: 'Array of exactly 4 answer options',
      items: { type: 'string' },
      minItems: 4,
      maxItems: 4,
    },
    correctAnswer: {
      type: 'integer',
      description: 'Index (0-3) of the correct answer',
      minimum: 0,
      maximum: 3,
    },
    explanation: {
      type: 'string',
      description: 'Detailed explanation of why the correct answer is right',
    },
    sources: {
      type: 'array',
      description: 'Reference sources for the question',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['questionText', 'options', 'correctAnswer', 'explanation', 'sources'],
};

/**
 * Get JSON Schema for Gemini API's responseSchema parameter
 */
export function getJsonSchemaForContentType(contentType: ContentType) {
  switch (contentType) {
    case 'blog':
      return blogJsonSchema;
    case 'exercise':
      return exerciseJsonSchema;
    case 'question':
      return questionJsonSchema;
    default:
      return blogJsonSchema;
  }
}

/**
 * Get Zod schema for runtime validation of AI responses
 */
export function getZodSchemaForContentType(contentType: ContentType) {
  switch (contentType) {
    case 'blog':
      return blogSchema;
    case 'exercise':
      return exerciseSchema;
    case 'question':
      return questionSchema;
    default:
      return blogSchema;
  }
}

// ============================================================================
// JSON TEMPLATES FOR GROQ
// ============================================================================

const BLOG_JSON_TEMPLATE = `{
  "title": "Your article title here",
  "slug": "url-friendly-slug-here",
  "excerpt": "A 2-3 sentence summary of the article for preview cards.",
  "body": "Full markdown content with ## headings, code blocks, and formatting. Include substantial content.",
  "category": "One of: Engineering, Tech, Tutorials, Study Guides, Certification Tips, News, Product",
  "readingTime": 5,
  "sources": [
    {"title": "Source Name", "url": "https://example.com/doc"}
  ]
}`;

const EXERCISE_JSON_TEMPLATE = `{
  "title": "Exercise title",
  "slug": "exercise-slug",
  "excerpt": "Brief description of what this exercise teaches.",
  "body": "Full markdown description of the problem with examples.",
  "starterCode": "// JavaScript/TypeScript starter code with helpful comments",
  "solutionCode": "// Complete working solution code",
  "difficulty": "One of: Beginner, Intermediate, Advanced",
  "sources": [
    {"title": "Reference Documentation", "url": "https://example.com/docs"}
  ]
}`;

const QUESTION_JSON_TEMPLATE = `{
  "questionText": "The full question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Detailed explanation of why the correct answer is right.",
  "sources": [
    {"title": "Official Documentation", "url": "https://example.com/docs"}
  ]
}`;

export function getJsonTemplateForContentType(contentType: ContentType): string {
  switch (contentType) {
    case 'blog':
      return BLOG_JSON_TEMPLATE;
    case 'exercise':
      return EXERCISE_JSON_TEMPLATE;
    case 'question':
      return QUESTION_JSON_TEMPLATE;
    default:
      return BLOG_JSON_TEMPLATE;
  }
}
