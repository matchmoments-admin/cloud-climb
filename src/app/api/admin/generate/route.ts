import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { generateContent, AI_PROVIDERS } from '@/lib/ai/gemini';
import type { AIProvider } from '@/lib/ai/gemini';
import { ContentType, systemPrompts } from '@/lib/ai/system-prompts';

const generateRequestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  contentType: z.enum(['blog', 'exercise', 'question']),
  customSystemPrompt: z.string().optional(),
  provider: z.enum(['gemini', 'groq']).default('gemini'),
});

export async function POST(request: Request) {
  console.log('[API /generate] POST request received');

  try {
    // Check authentication
    console.log('[API /generate] Checking authentication...');
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('[API /generate] No session found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized' },
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
        { error: 'Invalid request', details: validationResult.error.issues },
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

    return NextResponse.json({
      success: true,
      content,
      contentType,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[API /generate] Error occurred:', errorMessage);
    console.error('[API /generate] Full error:', error);

    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (errorMessage.includes('API key')) {
      statusCode = 503; // Service unavailable - config issue
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      statusCode = 429; // Too many requests
    } else if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
      statusCode = 422; // Unprocessable content
    }

    console.error('[API /generate] Returning status:', statusCode);

    return NextResponse.json(
      {
        error: errorMessage,
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
