import type { ContentType } from './system-prompts';
import { SchemaType, type Schema } from '@google/generative-ai';

// Blog content schema
export const blogSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: 'Article title, compelling and SEO-friendly',
    },
    slug: {
      type: SchemaType.STRING,
      description: 'URL-friendly slug using lowercase and hyphens',
    },
    excerpt: {
      type: SchemaType.STRING,
      description: '2-3 sentence summary for preview cards',
    },
    body: {
      type: SchemaType.STRING,
      description: 'Full article content in markdown format with ## headings and code blocks',
    },
    category: {
      type: SchemaType.STRING,
      description: 'One of: Engineering, Tech, Tutorials, Study Guides, Certification Tips, News, Product',
    },
    readingTime: {
      type: SchemaType.NUMBER,
      description: 'Estimated reading time in minutes',
    },
    sources: {
      type: SchemaType.ARRAY,
      description: 'Array of source references with titles and URLs',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['title', 'slug', 'excerpt', 'body', 'category', 'readingTime', 'sources'],
};

// Exercise content schema
export const exerciseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: 'Exercise name',
    },
    slug: {
      type: SchemaType.STRING,
      description: 'URL-friendly slug',
    },
    excerpt: {
      type: SchemaType.STRING,
      description: 'Brief description of what the exercise teaches',
    },
    body: {
      type: SchemaType.STRING,
      description: 'Full markdown description of the problem with examples',
    },
    starterCode: {
      type: SchemaType.STRING,
      description: 'JavaScript/TypeScript starter code with comments',
    },
    solutionCode: {
      type: SchemaType.STRING,
      description: 'Complete working solution',
    },
    difficulty: {
      type: SchemaType.STRING,
      description: 'One of: Beginner, Intermediate, Advanced',
    },
    sources: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['title', 'slug', 'excerpt', 'body', 'starterCode', 'solutionCode', 'difficulty', 'sources'],
};

// Question content schema
export const questionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    questionText: {
      type: SchemaType.STRING,
      description: 'The question text',
    },
    options: {
      type: SchemaType.ARRAY,
      description: 'Array of 4 answer options',
      items: {
        type: SchemaType.STRING,
      },
    },
    correctAnswer: {
      type: SchemaType.NUMBER,
      description: 'Index (0-3) of the correct answer',
    },
    explanation: {
      type: SchemaType.STRING,
      description: 'Detailed explanation of the correct answer',
    },
    sources: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['questionText', 'options', 'correctAnswer', 'explanation', 'sources'],
};

// Get schema by content type (for Gemini)
export function getSchemaForContentType(contentType: ContentType): Schema {
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

// JSON templates for Groq (doesn't support schema enforcement, needs explicit examples)
const BLOG_JSON_TEMPLATE = `{
  "title": "Your article title here",
  "slug": "url-friendly-slug-here",
  "excerpt": "A 2-3 sentence summary of the article for preview cards.",
  "body": "Full markdown content with ## headings, code blocks, and formatting.",
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

// Get JSON template for Groq prompts (string format for prompt injection)
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
