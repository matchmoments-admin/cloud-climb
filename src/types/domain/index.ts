/**
 * Domain Types for Cloud Climb
 *
 * UI-friendly types transformed from Salesforce raw types.
 */

export type ArticleType = 'Blog_Post' | 'Tutorial' | 'Exercise';

export interface Article {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  body: string;
  excerpt: string;
  featuredImage: string;
  category: string;
  tags: string[];
  author: Author;
  publishedDate: Date;
  readTime: number;
  viewCount: number;
  isFeatured: boolean;
  isPremium?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  articleType?: ArticleType;
  certification?: {
    id: string;
    name: string;
    code: string;
  };
  topic?: {
    id: string;
    name: string;
    code: string;
  };
  // Exercise-specific fields
  starterCode?: string;
  solutionCode?: string;
  instructions?: string;
}

export interface Author {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: string;
  bio: string;
  role: string;
  slug: string;
  email?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  articleCount?: number;
}

export interface Tag {
  name: string;
  slug: string;
  articleCount?: number;
}

export interface NewsletterSubscription {
  email: string;
  firstName?: string;
  lastName?: string;
  source: string;
}

export interface SearchResult {
  articles: Article[];
  totalCount: number;
  query: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Filter types
export interface ArticleFilters {
  category?: string;
  author?: string;
  tag?: string;
  search?: string;
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Question & Exercise Types
// =============================================================================

export type QuestionType =
  | 'Multiple_Choice'
  | 'True_False'
  | 'Multiple_Select'
  | 'Fill_Blank'
  | 'Code_Completion';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type CodeLanguage = 'JavaScript' | 'TypeScript' | 'Python' | 'HTML' | 'CSS' | 'SQL';

export interface Question {
  id: string;
  name: string;
  questionText: string;
  questionType: QuestionType;
  difficultyLevel?: DifficultyLevel;
  explanation?: string;
  codeSnippet?: string;
  codeLanguage?: CodeLanguage;
  hint?: string;
  points: number;
  isActive: boolean;
  topic?: {
    id: string;
    name: string;
  };
  tags: string[];
  answers: Answer[];
  testCases: TestCase[];
}

export interface Answer {
  id: string;
  answerText: string;
  isCorrect: boolean;
  sortOrder: number;
  feedback?: string;
  answerCode?: string;
}

export interface TestCase {
  id: string;
  name: string;
  inputParameters: string; // JSON string
  expectedOutput: string; // JSON string
  isHidden: boolean;
  isSample: boolean;
  description?: string;
  sortOrder: number;
  points?: number;
  timeoutSeconds?: number;
}

export interface ArticleQuestion {
  id: string;
  articleId: string;
  questionId: string;
  sortOrder: number;
  sectionTitle?: string;
  isRequired: boolean;
  question: Question;
}

// Extended Article type for tutorials and exercises
export interface ArticleWithQuestions extends Article {
  articleType: 'Blog_Post' | 'Tutorial' | 'Exercise';
  starterCode?: string;
  solutionCode?: string;
  instructions?: string;
  questions: ArticleQuestion[];
}

// Filter types for questions
export interface QuestionFilters {
  questionType?: QuestionType;
  difficultyLevel?: DifficultyLevel;
  codeLanguage?: CodeLanguage;
  topicId?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}
