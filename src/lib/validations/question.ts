import { z } from 'zod';

/**
 * Question Validation Schemas
 * Using Zod for runtime validation of API inputs
 */

// =============================================================================
// Enums and Constants
// =============================================================================

export const QuestionTypes = [
  'Multiple_Choice',
  'True_False',
  'Multiple_Select',
  'Fill_Blank',
  'Code_Completion',
] as const;

export const QuestionType = z.enum(QuestionTypes);
export type QuestionTypeValue = z.infer<typeof QuestionType>;

export const DifficultyLevels = ['Beginner', 'Intermediate', 'Advanced'] as const;
export const DifficultyLevel = z.enum(DifficultyLevels);
export type DifficultyLevelValue = z.infer<typeof DifficultyLevel>;

export const CodeLanguages = ['JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'SQL'] as const;
export const CodeLanguage = z.enum(CodeLanguages);
export type CodeLanguageValue = z.infer<typeof CodeLanguage>;

// =============================================================================
// Answer Schemas
// =============================================================================

/**
 * Schema for creating/updating an answer
 */
export const answerInputSchema = z.object({
  answerText: z
    .string()
    .min(1, 'Answer text is required')
    .max(10000, 'Answer text must be 10000 characters or less'),
  isCorrect: z.boolean(),
  sortOrder: z.number().min(0).default(0),
  feedback: z
    .string()
    .max(2000, 'Feedback must be 2000 characters or less')
    .optional()
    .nullable(),
  answerCode: z
    .string()
    .max(10, 'Answer code must be 10 characters or less')
    .optional()
    .nullable(),
});

export type AnswerInput = z.infer<typeof answerInputSchema>;

// =============================================================================
// Test Case Schemas
// =============================================================================

/**
 * Schema for creating/updating a test case
 */
export const testCaseInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Test case name is required')
    .max(100, 'Name must be 100 characters or less'),
  inputParameters: z
    .string()
    .min(1, 'Input parameters are required')
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Input parameters must be valid JSON' }
    ),
  expectedOutput: z
    .string()
    .min(1, 'Expected output is required')
    .refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Expected output must be valid JSON' }
    ),
  isHidden: z.boolean().default(false),
  isSample: z.boolean().default(false),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .nullable(),
  sortOrder: z.number().min(0).default(0),
  points: z.number().min(0).optional().nullable(),
  timeoutSeconds: z.number().min(1).max(60).optional().nullable(),
});

export type TestCaseInput = z.infer<typeof testCaseInputSchema>;

// =============================================================================
// Question Schemas
// =============================================================================

/**
 * Base question object schema (without refinements, used for updates)
 */
const questionBaseSchema = z.object({
  // Required fields for create (optional for update)
  questionText: z
    .string()
    .min(1, 'Question text is required')
    .max(32000, 'Question text must be 32000 characters or less'),
  questionType: QuestionType,

  // Optional fields
  difficultyLevel: DifficultyLevel.optional().nullable(),
  explanation: z
    .string()
    .max(32000, 'Explanation must be 32000 characters or less')
    .optional()
    .nullable(),
  codeSnippet: z
    .string()
    .max(32000, 'Code snippet must be 32000 characters or less')
    .optional()
    .nullable(),
  codeLanguage: CodeLanguage.optional().nullable(),
  hint: z
    .string()
    .max(2000, 'Hint must be 2000 characters or less')
    .optional()
    .nullable(),
  points: z.number().min(0).default(1),
  isActive: z.boolean().default(true),
  topicId: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),

  // Related data (for creating with answers/test cases)
  answers: z.array(answerInputSchema).optional(),
  testCases: z.array(testCaseInputSchema).optional(),
});

/**
 * Schema for creating a new question (with refinements for validation)
 */
export const questionCreateSchema = questionBaseSchema
  .refine(
    (data) => {
      // Code questions should have code language
      if (data.questionType === 'Code_Completion' && !data.codeLanguage) {
        return false;
      }
      return true;
    },
    {
      message: 'Code completion questions must specify a code language',
      path: ['codeLanguage'],
    }
  )
  .refine(
    (data) => {
      // Multiple choice/select should have answers
      if (
        ['Multiple_Choice', 'Multiple_Select', 'True_False'].includes(data.questionType) &&
        (!data.answers || data.answers.length < 2)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Multiple choice questions must have at least 2 answers',
      path: ['answers'],
    }
  )
  .refine(
    (data) => {
      // True/False should have exactly 2 answers
      if (data.questionType === 'True_False' && data.answers && data.answers.length !== 2) {
        return false;
      }
      return true;
    },
    {
      message: 'True/False questions must have exactly 2 answers',
      path: ['answers'],
    }
  )
  .refine(
    (data) => {
      // Check for at least one correct answer
      if (
        ['Multiple_Choice', 'Multiple_Select', 'True_False'].includes(data.questionType) &&
        data.answers &&
        !data.answers.some((a) => a.isCorrect)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Questions must have at least one correct answer',
      path: ['answers'],
    }
  );

export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;

/**
 * Schema for updating an existing question (no refinements, allows partial updates)
 */
export const questionUpdateSchema = questionBaseSchema.partial();

export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;

/**
 * Schema for question list query parameters
 */
export const questionListQuerySchema = z.object({
  questionType: QuestionType.optional(),
  difficultyLevel: DifficultyLevel.optional(),
  codeLanguage: CodeLanguage.optional(),
  topicId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdDate', 'name', 'questionType', 'difficultyLevel'])
    .default('createdDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;

// =============================================================================
// Article Question (Junction) Schemas
// =============================================================================

/**
 * Schema for linking a question to an article
 */
export const articleQuestionCreateSchema = z.object({
  articleId: z.string().min(1, 'Article ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  sortOrder: z.number().min(0).default(0),
  sectionTitle: z.string().max(100).optional().nullable(),
  isRequired: z.boolean().default(false),
});

export type ArticleQuestionCreateInput = z.infer<typeof articleQuestionCreateSchema>;

/**
 * Schema for updating an article-question link
 */
export const articleQuestionUpdateSchema = articleQuestionCreateSchema.partial().omit({
  articleId: true,
  questionId: true,
});

export type ArticleQuestionUpdateInput = z.infer<typeof articleQuestionUpdateSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate question create input
 */
export function validateQuestionCreate(data: unknown): {
  success: boolean;
  data?: QuestionCreateInput;
  error?: string;
} {
  const result = questionCreateSchema.safeParse(data);

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
 * Validate question update input
 */
export function validateQuestionUpdate(data: unknown): {
  success: boolean;
  data?: QuestionUpdateInput;
  error?: string;
} {
  const result = questionUpdateSchema.safeParse(data);

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
 * Validate question list query
 */
export function validateQuestionListQuery(params: URLSearchParams): {
  success: boolean;
  data?: QuestionListQuery;
  error?: string;
} {
  const rawData = {
    questionType: params.get('questionType') || undefined,
    difficultyLevel: params.get('difficultyLevel') || undefined,
    codeLanguage: params.get('codeLanguage') || undefined,
    topicId: params.get('topicId') || undefined,
    isActive: params.get('isActive') || undefined,
    search: params.get('search') || undefined,
    page: params.get('page') || '1',
    limit: params.get('limit') || '20',
    sortBy: params.get('sortBy') || 'createdDate',
    sortOrder: params.get('sortOrder') || 'desc',
  };

  const result = questionListQuerySchema.safeParse(rawData);

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
 * Validate article-question create input
 */
export function validateArticleQuestionCreate(data: unknown): {
  success: boolean;
  data?: ArticleQuestionCreateInput;
  error?: string;
} {
  const result = articleQuestionCreateSchema.safeParse(data);

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
 * Validate answer input
 */
export function validateAnswerInput(data: unknown): {
  success: boolean;
  data?: AnswerInput;
  error?: string;
} {
  const result = answerInputSchema.safeParse(data);

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
 * Validate test case input
 */
export function validateTestCaseInput(data: unknown): {
  success: boolean;
  data?: TestCaseInput;
  error?: string;
} {
  const result = testCaseInputSchema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: `${firstError.path.join('.')}: ${firstError.message}`,
    };
  }

  return { success: true, data: result.data };
}
