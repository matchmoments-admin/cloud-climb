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
  let genAI;
  try {
    genAI = getGeminiClient();
  } catch (error) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to environment variables.');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: getSchemaForContentType(contentType),
    },
  });

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (error: any) {
    console.error('[Gemini] Full error:', error);
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
  // Handle empty response
  if (!text || text.trim().length === 0) {
    throw new Error('AI returned an empty response. Please try again.');
  }

  // Clean up response - remove markdown code fences if present
  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Find JSON object if there's extra text
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  // Parse JSON - both providers use JSON mode so this should work
  try {
    const parsed = JSON.parse(jsonStr);

    // Validate that we have the required content field
    if (!parsed.body && !parsed.questionText) {
      console.error('[Parse] Response missing content field:', Object.keys(parsed));
      throw new Error('Response missing required content field (body or questionText)');
    }

    console.log('[Parse] Successfully parsed JSON with fields:', Object.keys(parsed).join(', '));
    return parsed as GeneratedContent;
  } catch (error: any) {
    // Log the first part of the response for debugging
    console.error('[Parse] Failed to parse JSON. First 500 chars:', jsonStr.substring(0, 500));
    console.error('[Parse] Error:', error.message);

    // Provide a more helpful error message
    if (error.message.includes('Unexpected token')) {
      throw new Error('AI returned malformed JSON. Please try again or switch providers.');
    }
    if (error.message.includes('missing')) {
      throw new Error(error.message);
    }

    throw new Error('Failed to parse AI response. Please try again.');
  }
}

// Main generate function with provider selection
export async function generateContent(
  userPrompt: string,
  contentType: ContentType,
  customSystemPrompt?: string,
  provider: AIProvider = 'gemini'
): Promise<GeneratedContent> {
  const systemPrompt = getSystemPrompt(contentType, customSystemPrompt);

  let text: string;

  if (provider === 'groq') {
    // Groq requires separate system and user messages for proper JSON mode
    // Also needs explicit JSON template since it doesn't support schema enforcement
    text = await generateWithGroq(userPrompt, systemPrompt, contentType);
  } else {
    // Gemini uses schema-based JSON mode with a single prompt
    const fullPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`;
    text = await generateWithGemini(fullPrompt, contentType);
  }

  return parseAIResponse(text);
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
