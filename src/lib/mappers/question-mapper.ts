/**
 * Question Mapper
 *
 * Transforms Salesforce Question__c, Answer__c, Test_Case__c records to domain types.
 */

import type {
  SF_Question__c,
  SF_Answer__c,
  SF_Test_Case__c,
  SF_Article_Question__c,
} from '@/types/salesforce/raw';
import type {
  Question,
  Answer,
  TestCase,
  ArticleQuestion,
  QuestionType,
  DifficultyLevel,
  CodeLanguage,
} from '@/types/domain';
import { parseTags } from '@/lib/utils';

// =============================================================================
// Answer Mapping
// =============================================================================

/**
 * Map Salesforce Answer__c to domain Answer
 */
export function mapAnswer(sf: SF_Answer__c): Answer {
  return {
    id: sf.Id,
    answerText: sf.Answer_Text__c || '',
    isCorrect: sf.Is_Correct__c || false,
    sortOrder: sf.Sort_Order__c || 0,
    feedback: sf.Feedback__c,
    answerCode: sf.Answer_Code__c,
  };
}

/**
 * Map array of Salesforce answers
 */
export function mapAnswers(sfAnswers: SF_Answer__c[]): Answer[] {
  return sfAnswers
    .map(mapAnswer)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// =============================================================================
// Test Case Mapping
// =============================================================================

/**
 * Map Salesforce Test_Case__c to domain TestCase
 */
export function mapTestCase(sf: SF_Test_Case__c): TestCase {
  return {
    id: sf.Id,
    name: sf.Test_Case_Name__c || sf.Name || 'Test Case',
    inputParameters: sf.Input_Parameters__c || '{}',
    expectedOutput: sf.Expected_Output__c || '{}',
    isHidden: sf.Is_Hidden__c || false,
    isSample: sf.Is_Sample__c || false,
    description: sf.Description__c,
    sortOrder: sf.Sort_Order__c || 0,
    points: sf.Points__c,
    timeoutSeconds: sf.Timeout_Seconds__c,
  };
}

/**
 * Map array of Salesforce test cases
 */
export function mapTestCases(sfTestCases: SF_Test_Case__c[]): TestCase[] {
  return sfTestCases
    .map(mapTestCase)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// =============================================================================
// Question Mapping
// =============================================================================

/**
 * Validate and cast question type
 */
function castQuestionType(type?: string): QuestionType {
  const validTypes: QuestionType[] = [
    'Multiple_Choice',
    'True_False',
    'Multiple_Select',
    'Fill_Blank',
    'Code_Completion',
  ];
  return validTypes.includes(type as QuestionType)
    ? (type as QuestionType)
    : 'Multiple_Choice';
}

/**
 * Validate and cast difficulty level
 */
function castDifficultyLevel(level?: string): DifficultyLevel | undefined {
  const validLevels: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
  return validLevels.includes(level as DifficultyLevel)
    ? (level as DifficultyLevel)
    : undefined;
}

/**
 * Validate and cast code language
 */
function castCodeLanguage(lang?: string): CodeLanguage | undefined {
  const validLangs: CodeLanguage[] = ['JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'SQL'];
  return validLangs.includes(lang as CodeLanguage)
    ? (lang as CodeLanguage)
    : undefined;
}

/**
 * Map Salesforce Question__c to domain Question
 * Note: Answers and test cases must be fetched separately and passed in
 */
export function mapQuestion(
  sf: SF_Question__c,
  answers: SF_Answer__c[] = [],
  testCases: SF_Test_Case__c[] = []
): Question {
  return {
    id: sf.Id,
    name: sf.Name || `Q-${sf.Id.slice(-4)}`,
    questionText: sf.Question_Text__c || '',
    questionType: castQuestionType(sf.Question_Type__c),
    difficultyLevel: castDifficultyLevel(sf.Difficulty_Level__c),
    explanation: sf.Explanation__c,
    codeSnippet: sf.Code_Snippet__c,
    codeLanguage: castCodeLanguage(sf.Code_Language__c),
    hint: sf.Hint__c,
    points: sf.Points__c || 1,
    isActive: sf.Is_Active__c ?? true,
    topic: sf.Topic__r
      ? {
          id: sf.Topic__r.Id,
          name: sf.Topic__r.Name || '',
        }
      : undefined,
    tags: parseTags(sf.Tags__c),
    answers: mapAnswers(answers),
    testCases: mapTestCases(testCases),
  };
}

/**
 * Map array of questions (without related data)
 */
export function mapQuestions(sfQuestions: SF_Question__c[]): Question[] {
  return sfQuestions.map((q) => mapQuestion(q, [], []));
}

// =============================================================================
// Article Question (Junction) Mapping
// =============================================================================

/**
 * Map Salesforce Article_Question__c to domain ArticleQuestion
 */
export function mapArticleQuestion(
  sf: SF_Article_Question__c,
  answers: SF_Answer__c[] = [],
  testCases: SF_Test_Case__c[] = []
): ArticleQuestion {
  const question = sf.Question__r
    ? mapQuestion(sf.Question__r, answers, testCases)
    : {
        id: sf.Question__c || '',
        name: '',
        questionText: '',
        questionType: 'Multiple_Choice' as QuestionType,
        points: 1,
        isActive: true,
        tags: [],
        answers: [],
        testCases: [],
      };

  return {
    id: sf.Id,
    articleId: sf.Article__c || '',
    questionId: sf.Question__c || '',
    sortOrder: sf.Sort_Order__c || 0,
    sectionTitle: sf.Section_Title__c,
    isRequired: sf.Is_Required__c || false,
    question,
  };
}

/**
 * Map array of article questions
 */
export function mapArticleQuestions(
  sfArticleQuestions: SF_Article_Question__c[],
  answersMap: Map<string, SF_Answer__c[]> = new Map(),
  testCasesMap: Map<string, SF_Test_Case__c[]> = new Map()
): ArticleQuestion[] {
  return sfArticleQuestions
    .map((aq) => {
      const questionId = aq.Question__c || '';
      return mapArticleQuestion(
        aq,
        answersMap.get(questionId) || [],
        testCasesMap.get(questionId) || []
      );
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// =============================================================================
// Reverse Mapping: Domain Input → Salesforce
// =============================================================================

import type {
  QuestionCreateInput,
  QuestionUpdateInput,
  AnswerInput,
  TestCaseInput,
} from '@/lib/validations/question';

/**
 * Map domain question input to Salesforce Question__c fields for creation
 */
export function mapQuestionToSalesforce(input: QuestionCreateInput): Record<string, unknown> {
  return {
    Question_Text__c: input.questionText,
    Question_Type__c: input.questionType,
    Difficulty_Level__c: input.difficultyLevel || null,
    Explanation__c: input.explanation || null,
    Code_Snippet__c: input.codeSnippet || null,
    Code_Language__c: input.codeLanguage || null,
    Hint__c: input.hint || null,
    Points__c: input.points ?? 1,
    Is_Active__c: input.isActive ?? true,
    Topic__c: input.topicId || null,
    Tags__c: input.tags?.length ? input.tags.join(', ') : null,
  };
}

/**
 * Map domain question input to Salesforce for update
 */
export function mapQuestionToSalesforceUpdate(input: QuestionUpdateInput): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (input.questionText !== undefined) result.Question_Text__c = input.questionText;
  if (input.questionType !== undefined) result.Question_Type__c = input.questionType;
  if (input.difficultyLevel !== undefined) result.Difficulty_Level__c = input.difficultyLevel || null;
  if (input.explanation !== undefined) result.Explanation__c = input.explanation || null;
  if (input.codeSnippet !== undefined) result.Code_Snippet__c = input.codeSnippet || null;
  if (input.codeLanguage !== undefined) result.Code_Language__c = input.codeLanguage || null;
  if (input.hint !== undefined) result.Hint__c = input.hint || null;
  if (input.points !== undefined) result.Points__c = input.points;
  if (input.isActive !== undefined) result.Is_Active__c = input.isActive;
  if (input.topicId !== undefined) result.Topic__c = input.topicId || null;
  if (input.tags !== undefined) {
    result.Tags__c = input.tags?.length ? input.tags.join(', ') : null;
  }

  return result;
}

/**
 * Map domain answer input to Salesforce Answer__c fields
 */
export function mapAnswerToSalesforce(
  input: AnswerInput,
  questionId: string
): Record<string, unknown> {
  return {
    Question__c: questionId,
    Answer_Text__c: input.answerText,
    Is_Correct__c: input.isCorrect,
    Sort_Order__c: input.sortOrder,
    Feedback__c: input.feedback || null,
    Answer_Code__c: input.answerCode || null,
  };
}

/**
 * Map domain test case input to Salesforce Test_Case__c fields
 */
export function mapTestCaseToSalesforce(
  input: TestCaseInput,
  questionId: string
): Record<string, unknown> {
  return {
    Question__c: questionId,
    Test_Case_Name__c: input.name,
    Input_Parameters__c: input.inputParameters,
    Expected_Output__c: input.expectedOutput,
    Is_Hidden__c: input.isHidden ?? false,
    Is_Sample__c: input.isSample ?? false,
    Description__c: input.description || null,
    Sort_Order__c: input.sortOrder,
    Points__c: input.points || null,
    Timeout_Seconds__c: input.timeoutSeconds || null,
  };
}

/**
 * Map article-question link to Salesforce
 */
export function mapArticleQuestionToSalesforce(
  articleId: string,
  questionId: string,
  sortOrder: number,
  sectionTitle?: string,
  isRequired?: boolean
): Record<string, unknown> {
  return {
    Article__c: articleId,
    Question__c: questionId,
    Sort_Order__c: sortOrder,
    Section_Title__c: sectionTitle || null,
    Is_Required__c: isRequired ?? false,
  };
}
