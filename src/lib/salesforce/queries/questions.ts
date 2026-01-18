/**
 * Question Query Functions for Cloud Climb
 *
 * Salesforce queries for Question__c, Answer__c, Test_Case__c with caching.
 */

import { getSalesforceClient } from '../client';
import { getCached } from '@/lib/cache/redis';
import { CacheKeys, CacheStrategy } from '@/lib/cache/strategies';
import {
  mapQuestion,
  mapQuestions,
  mapAnswers,
  mapTestCases,
  mapArticleQuestions,
} from '@/lib/mappers/question-mapper';
import type {
  SF_Question__c,
  SF_Answer__c,
  SF_Test_Case__c,
  SF_Article_Question__c,
} from '@/types/salesforce/raw';
import type { Question, Answer, TestCase, ArticleQuestion, QuestionFilters } from '@/types/domain';

// =============================================================================
// Field Definitions
// =============================================================================

const QUESTION_FIELDS = `
  Id,
  Name,
  Question_Text__c,
  Question_Type__c,
  Difficulty_Level__c,
  Explanation__c,
  Code_Snippet__c,
  Code_Language__c,
  Hint__c,
  Points__c,
  Is_Active__c,
  Topic__c,
  Topic__r.Id,
  Topic__r.Name,
  Tags__c,
  CreatedDate,
  LastModifiedDate
`.trim();

const ANSWER_FIELDS = `
  Id,
  Name,
  Question__c,
  Answer_Text__c,
  Is_Correct__c,
  Sort_Order__c,
  Feedback__c,
  Answer_Code__c
`.trim();

const TEST_CASE_FIELDS = `
  Id,
  Name,
  Question__c,
  Test_Case_Name__c,
  Input_Parameters__c,
  Expected_Output__c,
  Is_Hidden__c,
  Is_Sample__c,
  Description__c,
  Sort_Order__c,
  Points__c,
  Timeout_Seconds__c
`.trim();

const ARTICLE_QUESTION_FIELDS = `
  Id,
  Name,
  Article__c,
  Question__c,
  Sort_Order__c,
  Section_Title__c,
  Is_Required__c,
  Question__r.Id,
  Question__r.Name,
  Question__r.Question_Text__c,
  Question__r.Question_Type__c,
  Question__r.Difficulty_Level__c,
  Question__r.Explanation__c,
  Question__r.Code_Snippet__c,
  Question__r.Code_Language__c,
  Question__r.Hint__c,
  Question__r.Points__c,
  Question__r.Is_Active__c,
  Question__r.Topic__c,
  Question__r.Tags__c
`.trim();

// =============================================================================
// Question Queries
// =============================================================================

/**
 * Get all questions with optional filters
 */
export async function getQuestions(filters: QuestionFilters = {}): Promise<Question[]> {
  const sf = await getSalesforceClient();

  // Build WHERE clause
  const conditions: string[] = [];

  if (filters.questionType) {
    conditions.push(`Question_Type__c = '${filters.questionType}'`);
  }
  if (filters.difficultyLevel) {
    conditions.push(`Difficulty_Level__c = '${filters.difficultyLevel}'`);
  }
  if (filters.codeLanguage) {
    conditions.push(`Code_Language__c = '${filters.codeLanguage}'`);
  }
  if (filters.topicId) {
    conditions.push(`Topic__c = '${filters.topicId}'`);
  }
  if (filters.isActive !== undefined) {
    conditions.push(`Is_Active__c = ${filters.isActive}`);
  }
  if (filters.search) {
    const escaped = filters.search.replace(/'/g, "\\'");
    conditions.push(`Question_Text__c LIKE '%${escaped}%'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const query = `
    SELECT ${QUESTION_FIELDS}
    FROM Question__c
    ${whereClause}
    ORDER BY CreatedDate DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const records = await sf.query<SF_Question__c>(query);
  return mapQuestions(records);
}

/**
 * Get a single question by ID with all related data
 */
export async function getQuestionById(id: string): Promise<Question | null> {
  return getCached(
    CacheKeys.QUESTION_BY_ID(id),
    async () => {
      const sf = await getSalesforceClient();

      // Fetch question, answers, and test cases in parallel
      const [questionRecords, answerRecords, testCaseRecords] = await Promise.all([
        sf.query<SF_Question__c>(`
          SELECT ${QUESTION_FIELDS}
          FROM Question__c
          WHERE Id = '${id}'
        `),
        sf.query<SF_Answer__c>(`
          SELECT ${ANSWER_FIELDS}
          FROM Answer__c
          WHERE Question__c = '${id}'
          ORDER BY Sort_Order__c ASC
        `),
        sf.query<SF_Test_Case__c>(`
          SELECT ${TEST_CASE_FIELDS}
          FROM Test_Case__c
          WHERE Question__c = '${id}'
          ORDER BY Sort_Order__c ASC
        `),
      ]);

      if (questionRecords.length === 0) {
        return null;
      }

      return mapQuestion(questionRecords[0], answerRecords, testCaseRecords);
    },
    CacheStrategy.questionById
  );
}

/**
 * Get answers for a question
 */
export async function getAnswersByQuestionId(questionId: string): Promise<Answer[]> {
  return getCached(
    CacheKeys.ANSWERS_BY_QUESTION(questionId),
    async () => {
      const sf = await getSalesforceClient();

      const records = await sf.query<SF_Answer__c>(`
        SELECT ${ANSWER_FIELDS}
        FROM Answer__c
        WHERE Question__c = '${questionId}'
        ORDER BY Sort_Order__c ASC
      `);

      return mapAnswers(records);
    },
    CacheStrategy.answersByQuestion
  );
}

/**
 * Get test cases for a question
 */
export async function getTestCasesByQuestionId(questionId: string): Promise<TestCase[]> {
  return getCached(
    CacheKeys.TEST_CASES_BY_QUESTION(questionId),
    async () => {
      const sf = await getSalesforceClient();

      const records = await sf.query<SF_Test_Case__c>(`
        SELECT ${TEST_CASE_FIELDS}
        FROM Test_Case__c
        WHERE Question__c = '${questionId}'
        ORDER BY Sort_Order__c ASC
      `);

      return mapTestCases(records);
    },
    CacheStrategy.testCasesByQuestion
  );
}

// =============================================================================
// Article-Question Queries
// =============================================================================

/**
 * Get all questions linked to an article
 */
export async function getQuestionsByArticleId(articleId: string): Promise<ArticleQuestion[]> {
  return getCached(
    CacheKeys.ARTICLE_QUESTIONS(articleId),
    async () => {
      const sf = await getSalesforceClient();

      // First get the article-question junctions with question data
      const junctionRecords = await sf.query<SF_Article_Question__c>(`
        SELECT ${ARTICLE_QUESTION_FIELDS}
        FROM Article_Question__c
        WHERE Article__c = '${articleId}'
          AND Question__r.Is_Active__c = true
        ORDER BY Sort_Order__c ASC
      `);

      if (junctionRecords.length === 0) {
        return [];
      }

      // Get all question IDs
      const questionIds = junctionRecords
        .map((r) => r.Question__c)
        .filter((id): id is string => !!id);

      if (questionIds.length === 0) {
        return mapArticleQuestions(junctionRecords);
      }

      // Fetch all answers and test cases for these questions
      const [answerRecords, testCaseRecords] = await Promise.all([
        sf.query<SF_Answer__c>(`
          SELECT ${ANSWER_FIELDS}
          FROM Answer__c
          WHERE Question__c IN ('${questionIds.join("','")}')
          ORDER BY Sort_Order__c ASC
        `),
        sf.query<SF_Test_Case__c>(`
          SELECT ${TEST_CASE_FIELDS}
          FROM Test_Case__c
          WHERE Question__c IN ('${questionIds.join("','")}')
          ORDER BY Sort_Order__c ASC
        `),
      ]);

      // Group answers and test cases by question ID
      const answersMap = new Map<string, SF_Answer__c[]>();
      for (const answer of answerRecords) {
        const qId = answer.Question__c || '';
        if (!answersMap.has(qId)) {
          answersMap.set(qId, []);
        }
        answersMap.get(qId)!.push(answer);
      }

      const testCasesMap = new Map<string, SF_Test_Case__c[]>();
      for (const tc of testCaseRecords) {
        const qId = tc.Question__c || '';
        if (!testCasesMap.has(qId)) {
          testCasesMap.set(qId, []);
        }
        testCasesMap.get(qId)!.push(tc);
      }

      return mapArticleQuestions(junctionRecords, answersMap, testCasesMap);
    },
    CacheStrategy.articleQuestions
  );
}

// =============================================================================
// Admin CRUD Operations (no caching)
// =============================================================================

/**
 * Create a new question
 */
export async function createQuestion(data: Record<string, unknown>): Promise<string> {
  const sf = await getSalesforceClient();
  const id = await sf.create('Question__c', data);
  return id;
}

/**
 * Update a question
 */
export async function updateQuestion(id: string, data: Record<string, unknown>): Promise<void> {
  const sf = await getSalesforceClient();
  await sf.update('Question__c', id, data);
}

/**
 * Delete a question
 */
export async function deleteQuestion(id: string): Promise<void> {
  const sf = await getSalesforceClient();
  await sf.delete('Question__c', id);
}

/**
 * Create an answer
 */
export async function createAnswer(data: Record<string, unknown>): Promise<string> {
  const sf = await getSalesforceClient();
  const id = await sf.create('Answer__c', data);
  return id;
}

/**
 * Update an answer
 */
export async function updateAnswer(id: string, data: Record<string, unknown>): Promise<void> {
  const sf = await getSalesforceClient();
  await sf.update('Answer__c', id, data);
}

/**
 * Delete an answer
 */
export async function deleteAnswer(id: string): Promise<void> {
  const sf = await getSalesforceClient();
  await sf.delete('Answer__c', id);
}

/**
 * Create a test case
 */
export async function createTestCase(data: Record<string, unknown>): Promise<string> {
  const sf = await getSalesforceClient();
  const id = await sf.create('Test_Case__c', data);
  return id;
}

/**
 * Update a test case
 */
export async function updateTestCase(id: string, data: Record<string, unknown>): Promise<void> {
  const sf = await getSalesforceClient();
  await sf.update('Test_Case__c', id, data);
}

/**
 * Delete a test case
 */
export async function deleteTestCase(id: string): Promise<void> {
  const sf = await getSalesforceClient();
  await sf.delete('Test_Case__c', id);
}

/**
 * Create an article-question link
 */
export async function createArticleQuestion(data: Record<string, unknown>): Promise<string> {
  const sf = await getSalesforceClient();
  const id = await sf.create('Article_Question__c', data);
  return id;
}

/**
 * Update an article-question link
 */
export async function updateArticleQuestion(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const sf = await getSalesforceClient();
  await sf.update('Article_Question__c', id, data);
}

/**
 * Delete an article-question link
 */
export async function deleteArticleQuestion(id: string): Promise<void> {
  const sf = await getSalesforceClient();
  await sf.delete('Article_Question__c', id);
}

/**
 * Get total count of questions (for pagination)
 */
export async function getQuestionCount(filters: QuestionFilters = {}): Promise<number> {
  const sf = await getSalesforceClient();

  const conditions: string[] = [];

  if (filters.questionType) {
    conditions.push(`Question_Type__c = '${filters.questionType}'`);
  }
  if (filters.difficultyLevel) {
    conditions.push(`Difficulty_Level__c = '${filters.difficultyLevel}'`);
  }
  if (filters.isActive !== undefined) {
    conditions.push(`Is_Active__c = ${filters.isActive}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Use queryRaw to get the aggregate result
  const response = await sf.queryRaw<SF_Question__c>(`
    SELECT COUNT(Id) expr0 FROM Question__c ${whereClause}
  `);

  // The count is in totalSize for COUNT queries
  return response.totalSize;
}
