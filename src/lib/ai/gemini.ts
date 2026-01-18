import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { ContentType, getSystemPrompt } from './system-prompts';
import { getSchemaForContentType, getJsonTemplateForContentType } from './schemas';

// AI Provider types
export type AIProvider = 'gemini' | 'groq';

export const AI_PROVIDERS: { id: AIProvider; name: string; model: string }[] = [
  { id: 'gemini', name: 'Gemini', model: 'gemini-2.5-flash' },
  { id: 'groq', name: 'Groq (Llama)', model: 'llama-3.3-70b-versatile' },
];

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

// Initialize Groq client
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new Groq({ apiKey });
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

// Generate content using Gemini with JSON mode for guaranteed valid output
async function generateWithGemini(prompt: string, contentType: ContentType): Promise<string> {
  console.log('[Gemini] Starting generation...');
  console.log('[Gemini] Content type:', contentType);
  console.log('[Gemini] API key exists:', !!process.env.GEMINI_API_KEY);
  console.log('[Gemini] API key length:', process.env.GEMINI_API_KEY?.length || 0);

  let genAI;
  try {
    genAI = getGeminiClient();
    console.log('[Gemini] Client initialized');
  } catch (error) {
    console.error('[Gemini] Failed to initialize client:', error);
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to environment variables.');
  }

  const schema = getSchemaForContentType(contentType);
  console.log('[Gemini] Using schema for:', contentType);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });
  console.log('[Gemini] Model configured');

  let result;
  try {
    console.log('[Gemini] Sending request...');
    result = await model.generateContent(prompt);
    console.log('[Gemini] Got result');
  } catch (error: any) {
    console.error('[Gemini] Generation failed:', error?.message || error);
    const message = error?.message || String(error);

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
      throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY.');
    }
    if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) {
      throw new Error('Gemini rate limit exceeded. Try switching to Groq or wait a moment.');
    }
    if (message.includes('safety') || message.includes('blocked') || message.includes('SAFETY')) {
      throw new Error('Content blocked by Gemini safety filters. Try rephrasing your prompt.');
    }
    if (message.includes('RECITATION')) {
      throw new Error('Content blocked due to copyright concerns. Try a more original prompt.');
    }
    throw new Error(`Gemini error: ${message}`);
  }

  const response = result.response;
  const text = response.text();
  console.log('[Gemini] Response length:', text.length);
  console.log('[Gemini] Response preview:', text.substring(0, 200));
  return text;
}

// Generate content using Groq with proper system/user message structure
async function generateWithGroq(userPrompt: string, systemPrompt: string, contentType: ContentType): Promise<string> {
  let groq;
  try {
    groq = getGroqClient();
  } catch (error) {
    throw new Error('Groq API key is not configured. Please add GROQ_API_KEY to environment variables.');
  }

  // Get the JSON template for this content type - Groq needs explicit schema in prompt
  const jsonTemplate = getJsonTemplateForContentType(contentType);

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}

You MUST respond with valid JSON matching this EXACT structure:
${jsonTemplate}

CRITICAL REQUIREMENTS:
- Include ALL fields shown above
- The "sources" field MUST be an array of objects with "title" and "url" properties
- Do not add any extra fields
- Do not wrap in markdown code blocks
- Output raw JSON only`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '';
    console.log('[Groq] Response length:', content.length);
    return content;
  } catch (error: any) {
    console.error('[Groq] Full error:', error);
    const message = error?.message || String(error);

    if (message.includes('invalid_api_key') || message.includes('401')) {
      throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY.');
    }
    if (message.includes('rate_limit') || message.includes('429')) {
      throw new Error('Groq rate limit exceeded. Try switching to Gemini or wait a moment.');
    }
    // Pass through the full error for debugging
    throw new Error(`Groq error: ${message}`);
  }
}

// Parse JSON from AI response - both providers use JSON mode for reliable output
function parseAIResponse(text: string): GeneratedContent {
  console.log('[Parse] Starting parse, input length:', text?.length || 0);

  // Handle empty response
  if (!text || text.trim().length === 0) {
    console.error('[Parse] Empty response received');
    throw new Error('AI returned an empty response. Please try again.');
  }

  // Clean up response - remove markdown code fences if present
  let jsonStr = text.trim();
  console.log('[Parse] After trim, length:', jsonStr.length);

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    console.log('[Parse] Found markdown code fence, extracting...');
    jsonStr = jsonMatch[1].trim();
  }

  // Find JSON object if there's extra text
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  console.log('[Parse] Final JSON length:', jsonStr.length);
  console.log('[Parse] First 300 chars:', jsonStr.substring(0, 300));

  // Parse JSON - both providers use JSON mode so this should work
  try {
    const parsed = JSON.parse(jsonStr);
    console.log('[Parse] JSON.parse succeeded');
    console.log('[Parse] Parsed keys:', Object.keys(parsed));

    // Validate that we have the required content field
    if (!parsed.body && !parsed.questionText) {
      console.error('[Parse] Missing content field. Keys present:', Object.keys(parsed));
      throw new Error('Response missing required content field (body or questionText)');
    }

    console.log('[Parse] Validation passed, returning content');
    console.log('[Parse] Title:', parsed.title);
    console.log('[Parse] Body length:', parsed.body?.length || 0);
    return parsed as GeneratedContent;
  } catch (error: any) {
    console.error('[Parse] JSON.parse failed');
    console.error('[Parse] Error type:', error.constructor.name);
    console.error('[Parse] Error message:', error.message);
    console.error('[Parse] First 500 chars of input:', jsonStr.substring(0, 500));

    // Provide a more helpful error message
    if (error.message.includes('Unexpected token')) {
      throw new Error(`AI returned malformed JSON: ${error.message}`);
    }
    if (error.message.includes('missing')) {
      throw new Error(error.message);
    }

    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

// Main generate function with provider selection
export async function generateContent(
  userPrompt: string,
  contentType: ContentType,
  customSystemPrompt?: string,
  provider: AIProvider = 'gemini'
): Promise<GeneratedContent> {
  console.log('[Generate] Starting content generation');
  console.log('[Generate] Provider:', provider);
  console.log('[Generate] Content type:', contentType);
  console.log('[Generate] User prompt length:', userPrompt?.length || 0);
  console.log('[Generate] Custom system prompt:', !!customSystemPrompt);

  const systemPrompt = getSystemPrompt(contentType, customSystemPrompt);
  console.log('[Generate] System prompt length:', systemPrompt?.length || 0);

  let text: string;

  if (provider === 'groq') {
    console.log('[Generate] Using Groq provider');
    text = await generateWithGroq(userPrompt, systemPrompt, contentType);
  } else {
    console.log('[Generate] Using Gemini provider');
    const fullPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`;
    console.log('[Generate] Full prompt length:', fullPrompt.length);
    text = await generateWithGemini(fullPrompt, contentType);
  }

  console.log('[Generate] Got raw text, length:', text?.length || 0);
  const result = parseAIResponse(text);
  console.log('[Generate] Parse complete, returning result');
  return result;
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
