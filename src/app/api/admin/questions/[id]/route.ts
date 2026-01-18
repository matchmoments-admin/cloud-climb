import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceClient } from '@/lib/salesforce/client';
import {
  mapQuestion,
  mapQuestionToSalesforceUpdate,
  mapAnswerToSalesforce,
  mapTestCaseToSalesforce,
} from '@/lib/mappers/question-mapper';
import { validateQuestionUpdate } from '@/lib/validations/question';
import type { SF_Question__c, SF_Answer__c, SF_Test_Case__c } from '@/types/salesforce/raw';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Full fields for editing
const QUESTION_FULL_FIELDS = `
  Id, Name, Question_Text__c, Question_Type__c, Difficulty_Level__c,
  Explanation__c, Code_Snippet__c, Code_Language__c, Hint__c,
  Points__c, Is_Active__c, Topic__c, Topic__r.Id, Topic__r.Name, Tags__c,
  CreatedDate, LastModifiedDate
`.trim();

const ANSWER_FIELDS = `
  Id, Name, Question__c, Answer_Text__c, Is_Correct__c, Sort_Order__c, Feedback__c, Answer_Code__c
`.trim();

const TEST_CASE_FIELDS = `
  Id, Name, Question__c, Test_Case_Name__c, Input_Parameters__c, Expected_Output__c,
  Is_Hidden__c, Is_Sample__c, Description__c, Sort_Order__c, Points__c, Timeout_Seconds__c
`.trim();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/questions/[id]
 * Get a single question by ID with all answers and test cases
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const client = getSalesforceClient();

    // Fetch question, answers, and test cases in parallel
    const [questionRecords, answerRecords, testCaseRecords] = await Promise.all([
      client.query<SF_Question__c>(`
        SELECT ${QUESTION_FULL_FIELDS}
        FROM Question__c
        WHERE Id = '${id}'
        LIMIT 1
      `),
      client.query<SF_Answer__c>(`
        SELECT ${ANSWER_FIELDS}
        FROM Answer__c
        WHERE Question__c = '${id}'
        ORDER BY Sort_Order__c ASC
      `),
      client.query<SF_Test_Case__c>(`
        SELECT ${TEST_CASE_FIELDS}
        FROM Test_Case__c
        WHERE Question__c = '${id}'
        ORDER BY Sort_Order__c ASC
      `),
    ]);

    if (questionRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    const question = mapQuestion(questionRecords[0], answerRecords, testCaseRecords);

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Question GET] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/questions/[id]
 * Update an existing question
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = validateQuestionUpdate(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const input = validation.data!;
    const client = getSalesforceClient();

    // Check if question exists
    const existingQuery = `SELECT Id FROM Question__c WHERE Id = '${id}' LIMIT 1`;
    const existing = await client.query<SF_Question__c>(existingQuery);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    // Map to Salesforce fields (only changed fields)
    const sfData = mapQuestionToSalesforceUpdate(input);

    // Update question in Salesforce (only if there are fields to update)
    if (Object.keys(sfData).length > 0) {
      await client.update('Question__c', id, sfData);
      console.log(`[Admin Question] Updated question: ${id}`);
    }

    // Handle answers if provided
    if (input.answers !== undefined) {
      // Delete existing answers
      const existingAnswers = await client.query<SF_Answer__c>(
        `SELECT Id FROM Answer__c WHERE Question__c = '${id}'`
      );
      for (const answer of existingAnswers) {
        await client.delete('Answer__c', answer.Id);
      }

      // Create new answers
      if (input.answers && input.answers.length > 0) {
        for (const answer of input.answers) {
          const sfAnswerData = mapAnswerToSalesforce(answer, id);
          await client.create('Answer__c', sfAnswerData);
        }
        console.log(`[Admin Question] Replaced answers for question ${id}`);
      }
    }

    // Handle test cases if provided
    if (input.testCases !== undefined) {
      // Delete existing test cases
      const existingTestCases = await client.query<SF_Test_Case__c>(
        `SELECT Id FROM Test_Case__c WHERE Question__c = '${id}'`
      );
      for (const tc of existingTestCases) {
        await client.delete('Test_Case__c', tc.Id);
      }

      // Create new test cases
      if (input.testCases && input.testCases.length > 0) {
        for (const testCase of input.testCases) {
          const sfTestCaseData = mapTestCaseToSalesforce(testCase, id);
          await client.create('Test_Case__c', sfTestCaseData);
        }
        console.log(`[Admin Question] Replaced test cases for question ${id}`);
      }
    }

    return NextResponse.json({
      success: true,
      id,
      message: 'Question updated successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Question PATCH] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/questions/[id]
 * Delete a question and all related answers and test cases
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const client = getSalesforceClient();

    // Check if question exists
    const existingQuery = `SELECT Id FROM Question__c WHERE Id = '${id}' LIMIT 1`;
    const existing = await client.query<SF_Question__c>(existingQuery);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    // Delete related answers first (child records)
    const answers = await client.query<SF_Answer__c>(
      `SELECT Id FROM Answer__c WHERE Question__c = '${id}'`
    );
    for (const answer of answers) {
      await client.delete('Answer__c', answer.Id);
    }

    // Delete related test cases
    const testCases = await client.query<SF_Test_Case__c>(
      `SELECT Id FROM Test_Case__c WHERE Question__c = '${id}'`
    );
    for (const tc of testCases) {
      await client.delete('Test_Case__c', tc.Id);
    }

    // Delete article-question junctions
    const junctions = await client.query<{ Id: string }>(
      `SELECT Id FROM Article_Question__c WHERE Question__c = '${id}'`
    );
    for (const junction of junctions) {
      await client.delete('Article_Question__c', junction.Id);
    }

    // Delete the question itself
    await client.delete('Question__c', id);

    console.log(`[Admin Question] Deleted question: ${id}`);

    return NextResponse.json({
      success: true,
      id,
      message: 'Question deleted successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Question DELETE] Error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
