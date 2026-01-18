import { GoogleGenerativeAI } from '@google/generative-ai';
import { ContentType, getSystemPrompt } from './system-prompts';

// Initialize client (client-side safe - API key only used server-side)
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

export interface GeneratedBlogContent {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  readingTime: number;
  sources: Array<{ title: string; url: string }>;
}

export interface GeneratedExerciseContent {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  starterCode: string;
  solutionCode: string;
  difficulty: string;
  sources: Array<{ title: string; url: string }>;
}

export interface GeneratedQuestionContent {
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sources: Array<{ title: string; url: string }>;
}

export type GeneratedContent =
  | GeneratedBlogContent
  | GeneratedExerciseContent
  | GeneratedQuestionContent;

export async function generateContent(
  userPrompt: string,
  contentType: ContentType,
  customSystemPrompt?: string
): Promise<GeneratedContent> {
  let genAI;
  try {
    genAI = getGeminiClient();
  } catch (error) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to environment variables.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const systemPrompt = getSystemPrompt(contentType, customSystemPrompt);

  const prompt = `${systemPrompt}

User Request: ${userPrompt}

Remember to output ONLY valid JSON matching the schema above. No markdown code blocks, just the raw JSON.`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (error: any) {
    // Log full error for debugging
    console.error('[Gemini] Full error:', error);

    // Handle specific Gemini API errors
    const message = error?.message || String(error);
    const errorDetails = error?.errorDetails || error?.response?.data || null;

    console.error('[Gemini] Error message:', message);
    if (errorDetails) {
      console.error('[Gemini] Error details:', JSON.stringify(errorDetails));
    }

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in Vercel environment variables.');
    }
    if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) {
      throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
    }
    if (message.includes('safety') || message.includes('blocked') || message.includes('SAFETY')) {
      throw new Error('Content was blocked by Gemini safety filters. Try rephrasing your prompt.');
    }
    if (message.includes('RECITATION')) {
      throw new Error('Content was blocked due to potential copyright concerns. Try a more original prompt.');
    }
    if (message.includes('timeout') || message.includes('DEADLINE_EXCEEDED')) {
      throw new Error('Gemini API request timed out. Please try again.');
    }
    if (message.includes('Failed to fetch') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      throw new Error('Cannot connect to Gemini API. Check network/firewall settings.');
    }

    // Show the actual error message for debugging
    throw new Error(`Gemini error: ${message}`);
  }

  const response = await result.response;
  const text = response.text();

  if (!text || text.trim().length === 0) {
    throw new Error('Gemini returned an empty response. Please try a different prompt.');
  }

  // Parse the JSON response
  try {
    // Try to extract JSON from the response (in case it includes markdown)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Also try to find raw JSON object
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    return parsed as GeneratedContent;
  } catch (error) {
    console.error('Failed to parse Gemini response:', text.substring(0, 500));
    throw new Error('Failed to parse AI response. The model returned invalid JSON. Please try again.');
  }
}

// Type guards for checking content type
export function isBlogContent(content: GeneratedContent): content is GeneratedBlogContent {
  return 'body' in content && 'category' in content && 'readingTime' in content;
}

export function isExerciseContent(content: GeneratedContent): content is GeneratedExerciseContent {
  return 'starterCode' in content && 'solutionCode' in content;
}

export function isQuestionContent(content: GeneratedContent): content is GeneratedQuestionContent {
  return 'questionText' in content && 'options' in content && 'correctAnswer' in content;
}
