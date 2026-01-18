// Cache Time-To-Live (TTL) strategies in seconds

export const CacheTTL = {
  SHORT: 300,           // 5 minutes - frequently changing data
  MEDIUM: 1800,         // 30 minutes - moderate changes
  LONG: 3600,           // 1 hour - stable data
  VERY_LONG: 86400,     // 24 hours - rarely changes
};

// Cache key patterns for Cloud Climb blog

export const CacheKeys = {
  // Articles
  ARTICLES_ALL: 'articles:all',
  ARTICLES_FEATURED: 'articles:featured',
  ARTICLES_LATEST: 'articles:latest',
  ARTICLE_BY_SLUG: (slug: string) => `articles:slug:${slug}`,
  ARTICLE_BY_ID: (id: string) => `articles:id:${id}`,
  ARTICLES_BY_CATEGORY: (category: string) => `articles:category:${category}`,
  ARTICLES_BY_AUTHOR: (authorId: string) => `articles:author:${authorId}`,
  ARTICLES_BY_TAG: (tag: string) => `articles:tag:${tag}`,
  ARTICLES_RELATED: (articleId: string) => `articles:related:${articleId}`,
  ARTICLES_SEARCH: (query: string) => `articles:search:${encodeURIComponent(query)}`,

  // Authors
  AUTHORS_ALL: 'authors:all',
  AUTHOR_BY_SLUG: (slug: string) => `authors:slug:${slug}`,
  AUTHOR_BY_ID: (id: string) => `authors:id:${id}`,

  // Categories
  CATEGORIES_ALL: 'categories:all',
  CATEGORY_BY_SLUG: (slug: string) => `categories:slug:${slug}`,

  // Newsletter
  NEWSLETTER_STATS: 'newsletter:stats',

  // Homepage
  HOMEPAGE_DATA: 'homepage:data',

  // Questions
  QUESTIONS_ALL: 'questions:all',
  QUESTION_BY_ID: (id: string) => `questions:id:${id}`,
  QUESTIONS_BY_TYPE: (type: string) => `questions:type:${type}`,
  QUESTIONS_BY_TOPIC: (topicId: string) => `questions:topic:${topicId}`,
  ANSWERS_BY_QUESTION: (questionId: string) => `answers:question:${questionId}`,
  TEST_CASES_BY_QUESTION: (questionId: string) => `testcases:question:${questionId}`,

  // Article Questions (junction)
  ARTICLE_QUESTIONS: (articleId: string) => `articlequestions:article:${articleId}`,
  TUTORIALS_ALL: 'tutorials:all',
  TUTORIAL_BY_SLUG: (slug: string) => `tutorials:slug:${slug}`,
  EXERCISES_ALL: 'exercises:all',
  EXERCISE_BY_SLUG: (slug: string) => `exercises:slug:${slug}`,
};

// Cache TTL assignments by data type

export const CacheStrategy = {
  // Articles - updated when published
  articlesAll: CacheTTL.SHORT,
  articlesFeatured: CacheTTL.SHORT,
  articlesLatest: CacheTTL.SHORT,
  articleBySlug: CacheTTL.SHORT,
  articlesByCategory: CacheTTL.SHORT,
  articlesByAuthor: CacheTTL.SHORT,
  articlesRelated: CacheTTL.MEDIUM,
  articlesSearch: CacheTTL.SHORT,

  // Authors - relatively stable
  authorsAll: CacheTTL.LONG,
  authorBySlug: CacheTTL.LONG,

  // Categories - very stable
  categoriesAll: CacheTTL.VERY_LONG,
  categoryBySlug: CacheTTL.VERY_LONG,

  // Homepage
  homepageData: CacheTTL.SHORT,

  // Questions - relatively stable once created
  questionsAll: CacheTTL.MEDIUM,
  questionById: CacheTTL.MEDIUM,
  answersByQuestion: CacheTTL.MEDIUM,
  testCasesByQuestion: CacheTTL.MEDIUM,
  articleQuestions: CacheTTL.SHORT,
  tutorialsAll: CacheTTL.SHORT,
  tutorialBySlug: CacheTTL.SHORT,
  exercisesAll: CacheTTL.SHORT,
  exerciseBySlug: CacheTTL.SHORT,
};
