import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceClient } from '@/lib/salesforce/client';
import { mapQuestion, mapQuestionToSalesforce, mapAnswerToSalesforce, mapTestCaseToSalesforce } from '@/lib/mappers/question-mapper';
import { validateQuestionCreate, validateQuestionListQuery } from '@/lib/validations/question';
import type { SF_Question__c, SF_Answer__c, SF_Test_Case__c } from '@/types/salesforce/raw';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fields to retrieve for list view
const QUESTION_LIST_FIELDS = `
  Id, Name, Question_Text__c, Question_Type__c, Difficulty_Level__c,
  Code_Language__c, Points__c, Is_Active__c, Topic__c, Tags__c,
  CreatedDate, LastModifiedDate
`.trim();

/**
 * GET /api/admin/questions
 * List questions with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const validation = validateQuestionListQuery(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { questionType, difficultyLevel, codeLanguage, topicId, isActive, search, page, limit, sortBy, sortOrder } = validation.data!;

    // Build SOQL query
    const conditions: string[] = [];

    if (questionType) {
      conditions.push(`Question_Type__c = '${questionType}'`);
    }
    if (difficultyLevel) {
      conditions.push(`Difficulty_Level__c = '${difficultyLevel}'`);
    }
    if (codeLanguage) {
      conditions.push(`Code_Language__c = '${codeLanguage}'`);
    }
    if (topicId) {
      conditions.push(`Topic__c = '${topicId}'`);
    }
    if (isActive !== undefined) {
      conditions.push(`Is_Active__c = ${isActive}`);
    }
    if (search) {
      const escapedSearch = search.replace(/'/g, "\\'");
      conditions.push(`Question_Text__c LIKE '%${escapedSearch}%'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Map sort field to Salesforce field
    const sortFieldMap: Record<string, string> = {
      createdDate: 'CreatedDate',
      name: 'Name',
      questionType: 'Question_Type__c',
      difficultyLevel: 'Difficulty_Level__c',
    };
    const sortField = sortFieldMap[sortBy] || 'CreatedDate';
    const orderClause = `ORDER BY ${sortField} ${sortOrder.toUpperCase()} NULLS LAST`;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get total count
    const client = getSalesforceClient();
    const countQuery = `SELECT Id FROM Question__c ${whereClause}`;
    const countResult = await client.queryRaw<SF_Question__c>(countQuery);
    const total = countResult.totalSize;

    // Get questions
    const query = `
      SELECT ${QUESTION_LIST_FIELDS}
      FROM Question__c
      ${whereClause}
      ${orderClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `.trim();

    const records = await client.query<SF_Question__c>(query);
    const questions = records.map((q) => mapQuestion(q, [], []));

    return NextResponse.json({
      success: true,
      questions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + questions.length < total,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Questions GET] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/questions
 * Create a new question with optional answers and test cases
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateQuestionCreate(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const input = validation.data!;
    const client = getSalesforceClient();

    // Map question to Salesforce fields
    const sfQuestionData = mapQuestionToSalesforce(input);

    // Create question in Salesforce
    const questionId = await client.create('Question__c', sfQuestionData);

    console.log(`[Admin Questions] Created question: ${questionId}`);

    // Create answers if provided
    if (input.answers && input.answers.length > 0) {
      for (const answer of input.answers) {
        const sfAnswerData = mapAnswerToSalesforce(answer, questionId);
        await client.create('Answer__c', sfAnswerData);
      }
      console.log(`[Admin Questions] Created ${input.answers.length} answers for question ${questionId}`);
    }

    // Create test cases if provided
    if (input.testCases && input.testCases.length > 0) {
      for (const testCase of input.testCases) {
        const sfTestCaseData = mapTestCaseToSalesforce(testCase, questionId);
        await client.create('Test_Case__c', sfTestCaseData);
      }
      console.log(`[Admin Questions] Created ${input.testCases.length} test cases for question ${questionId}`);
    }

    return NextResponse.json({
      success: true,
      id: questionId,
      message: 'Question created successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Questions POST] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
