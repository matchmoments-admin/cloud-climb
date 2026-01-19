import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { generateContent, AI_PROVIDERS, isBlogContent, isExerciseContent, isQuestionContent } from '@/lib/ai/gemini';
import type { AIProvider, GeneratedBlogContent, GeneratedExerciseContent, GeneratedQuestionContent } from '@/lib/ai/gemini';
import { ContentType, systemPrompts } from '@/lib/ai/system-prompts';

// Error codes for structured error responses
type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'VALIDATION_ERROR'
  | 'JSON_PARSE_ERROR'
  | 'INCOMPLETE_RESPONSE'
  | 'API_KEY_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'SAFETY_FILTER'
  | 'GENERATION_ERROR'
  | 'INTERNAL_ERROR';

const generateRequestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  contentType: z.enum(['blog', 'exercise', 'question']),
  customSystemPrompt: z.string().optional(),
  provider: z.enum(['gemini', 'groq']).default('gemini'),
});

// Validate that generated content has all required fields populated
function validateGeneratedContent(content: unknown, contentType: ContentType): string[] {
  const missingFields: string[] = [];

  if (contentType === 'blog' && isBlogContent(content as GeneratedBlogContent)) {
    const blog = content as GeneratedBlogContent;
    if (!blog.title?.trim()) missingFields.push('title');
    if (!blog.body?.trim()) missingFields.push('body');
    if (!blog.slug?.trim()) missingFields.push('slug');
    if (!blog.excerpt?.trim()) missingFields.push('excerpt');
    if (!blog.category?.trim()) missingFields.push('category');
    if (typeof blog.readingTime !== 'number') missingFields.push('readingTime');
  } else if (contentType === 'exercise' && isExerciseContent(content as GeneratedExerciseContent)) {
    const exercise = content as GeneratedExerciseContent;
    if (!exercise.title?.trim()) missingFields.push('title');
    if (!exercise.body?.trim()) missingFields.push('body');
    if (!exercise.starterCode?.trim()) missingFields.push('starterCode');
    if (!exercise.solutionCode?.trim()) missingFields.push('solutionCode');
  } else if (contentType === 'question' && isQuestionContent(content as GeneratedQuestionContent)) {
    const question = content as GeneratedQuestionContent;
    if (!question.questionText?.trim()) missingFields.push('questionText');
    if (!question.options?.length) missingFields.push('options');
    if (typeof question.correctAnswer !== 'number') missingFields.push('correctAnswer');
  }

  return missingFields;
}

// Determine error code from error message
function getErrorCode(message: string): ErrorCode {
  if (message.includes('parse') || message.includes('JSON')) return 'JSON_PARSE_ERROR';
  if (message.includes('missing') || message.includes('Missing')) return 'INCOMPLETE_RESPONSE';
  if (message.includes('API key') || message.includes('API_KEY')) return 'API_KEY_ERROR';
  if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) return 'RATE_LIMIT_ERROR';
  if (message.includes('safety') || message.includes('blocked') || message.includes('SAFETY')) return 'SAFETY_FILTER';
  return 'GENERATION_ERROR';
}

export async function POST(request: Request) {
  console.log('[API /generate] POST request received');

  try {
    // Check authentication
    console.log('[API /generate] Checking authentication...');
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('[API /generate] No session found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' as ErrorCode },
        { status: 401 }
      );
    }
    console.log('[API /generate] Authenticated as:', session.user?.email);

    // Parse and validate request body
    const body = await request.json();
    console.log('[API /generate] Request body:', {
      prompt: body.prompt?.substring(0, 50) + '...',
      contentType: body.contentType,
      provider: body.provider,
      hasCustomPrompt: !!body.customSystemPrompt,
    });

    const validationResult = generateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      console.log('[API /generate] Validation failed:', validationResult.error.issues);
      return NextResponse.json(
        {
          error: 'Invalid request',
          code: 'VALIDATION_ERROR' as ErrorCode,
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const { prompt, contentType, customSystemPrompt, provider } = validationResult.data;
    console.log('[API /generate] Calling generateContent...');

    // Generate content
    const content = await generateContent(
      prompt,
      contentType as ContentType,
      customSystemPrompt,
      provider as AIProvider
    );

    console.log('[API /generate] Generation successful');
    console.log('[API /generate] Content keys:', Object.keys(content));

    // Final validation - ensure all required fields are populated
    const missingFields = validateGeneratedContent(content, contentType as ContentType);
    if (missingFields.length > 0) {
      console.error('[API /generate] Content missing fields:', missingFields);
      return NextResponse.json(
        {
          error: `Generated content is incomplete. Missing: ${missingFields.join(', ')}`,
          code: 'INCOMPLETE_RESPONSE' as ErrorCode,
          missingFields,
          content, // Return partial content for debugging
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content,
      contentType,
      provider,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[API /generate] Error occurred:', errorMessage);
    console.error('[API /generate] Full error:', error);

    const errorCode = getErrorCode(errorMessage);

    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (errorCode === 'API_KEY_ERROR') statusCode = 503;
    else if (errorCode === 'RATE_LIMIT_ERROR') statusCode = 429;
    else if (errorCode === 'SAFETY_FILTER') statusCode = 422;

    console.error('[API /generate] Returning status:', statusCode, 'code:', errorCode);

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        message: errorMessage,
      },
      { status: statusCode }
    );
  }
}

// GET endpoint to retrieve default system prompts
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType') as ContentType | null;

    if (contentType && systemPrompts[contentType]) {
      return NextResponse.json({
        contentType,
        systemPrompt: systemPrompts[contentType],
      });
    }

    return NextResponse.json({
      systemPrompts,
      providers: AI_PROVIDERS,
    });
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system prompts' },
      { status: 500 }
    );
  }
}
