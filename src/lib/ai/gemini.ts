import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { ContentType, getSystemPrompt } from './system-prompts';

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

// Generate content using Gemini
async function generateWithGemini(prompt: string): Promise<string> {
  let genAI;
  try {
    genAI = getGeminiClient();
  } catch (error) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to environment variables.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

  const response = await result.response;
  return response.text();
}

// Generate content using Groq
async function generateWithGroq(prompt: string): Promise<string> {
  let groq;
  try {
    groq = getGroqClient();
  } catch (error) {
    throw new Error('Groq API key is not configured. Please add GROQ_API_KEY to environment variables.');
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('[Groq] Full error:', error);
    const message = error?.message || String(error);

    if (message.includes('invalid_api_key') || message.includes('401')) {
      throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY.');
    }
    if (message.includes('rate_limit') || message.includes('429')) {
      throw new Error('Groq rate limit exceeded. Try switching to Gemini or wait a moment.');
    }
    throw new Error(`Groq error: ${message}`);
  }
}

// Parse JSON from AI response with robust error handling
function parseAIResponse(text: string): GeneratedContent {
  if (!text || text.trim().length === 0) {
    throw new Error('AI returned an empty response. Please try a different prompt.');
  }

  // Try to extract JSON from markdown code fences
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Find the JSON object boundaries
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  // Try direct parsing first
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed as GeneratedContent;
  } catch (firstError) {
    console.log('Direct JSON parse failed, attempting repair...');
  }

  // Try to repair common JSON issues
  try {
    // Extract fields manually using regex for robustness
    const extractField = (fieldName: string, isNumber = false): string | number | null => {
      const pattern = isNumber
        ? new RegExp(`"${fieldName}"\\s*:\\s*(\\d+)`)
        : new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
      const match = jsonStr.match(pattern);
      if (match) {
        return isNumber ? parseInt(match[1], 10) : match[1];
      }
      return null;
    };

    // Extract body field specially (it's usually the problematic one)
    const bodyMatch = jsonStr.match(/"body"\s*:\s*"([\s\S]*?)"\s*,\s*"category"/);
    let bodyContent = '';
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }

    // Extract sources array
    const sourcesMatch = jsonStr.match(/"sources"\s*:\s*(\[[\s\S]*?\])\s*\}?\s*$/);
    let sources: Array<{ title: string; url: string }> = [];
    if (sourcesMatch) {
      try {
        sources = JSON.parse(sourcesMatch[1]);
      } catch {
        sources = [];
      }
    }

    // Build the object manually
    const result: any = {
      title: extractField('title') || 'Untitled',
      slug: extractField('slug') || 'untitled',
      excerpt: extractField('excerpt') || '',
      body: bodyContent,
      category: extractField('category') || 'Tutorials',
      readingTime: extractField('readingTime', true) || 5,
      sources,
    };

    // For questions
    if (jsonStr.includes('"questionText"')) {
      result.questionText = extractField('questionText') || '';
      result.explanation = extractField('explanation') || '';
      result.correctAnswer = extractField('correctAnswer', true) || 0;

      const optionsMatch = jsonStr.match(/"options"\s*:\s*(\[[\s\S]*?\])/);
      if (optionsMatch) {
        try {
          result.options = JSON.parse(optionsMatch[1]);
        } catch {
          result.options = [];
        }
      }
    }

    // For exercises
    if (jsonStr.includes('"starterCode"')) {
      result.starterCode = extractField('starterCode') || '';
      result.solutionCode = extractField('solutionCode') || '';
      result.difficulty = extractField('difficulty') || 'Intermediate';
    }

    if (result.body || result.questionText) {
      console.log('JSON repair successful');
      return result as GeneratedContent;
    }

    throw new Error('Could not extract content from response');
  } catch (repairError) {
    console.error('Failed to parse AI response:', text.substring(0, 1000));
    throw new Error('Failed to parse AI response. The model returned invalid JSON. Please try again.');
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

  const prompt = `${systemPrompt}

User Request: ${userPrompt}

Remember to output ONLY valid JSON matching the schema above. No markdown code blocks, just the raw JSON.`;

  let text: string;

  if (provider === 'groq') {
    text = await generateWithGroq(prompt);
  } else {
    text = await generateWithGemini(prompt);
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
