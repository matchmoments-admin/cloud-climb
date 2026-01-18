import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { generateContent } from '@/lib/ai/gemini';
import { ContentType, systemPrompts } from '@/lib/ai/system-prompts';

const generateRequestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  contentType: z.enum(['blog', 'exercise', 'question']),
  customSystemPrompt: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = generateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { prompt, contentType, customSystemPrompt } = validationResult.data;

    // Generate content
    const content = await generateContent(
      prompt,
      contentType as ContentType,
      customSystemPrompt
    );

    return NextResponse.json({
      success: true,
      content,
      contentType,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
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
    });
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system prompts' },
      { status: 500 }
    );
  }
}
