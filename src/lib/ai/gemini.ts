/**
 * AI Content Generation Service
 *
 * Uses the @google/genai SDK with Zod validation
 * Supports both Gemini (primary) and Groq (fallback)
 */

import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { ContentType, getSystemPrompt } from './system-prompts';
import {
  getJsonSchemaForContentType,
  getZodSchemaForContentType,
  getJsonTemplateForContentType,
  type GeneratedContent,
  type GeneratedBlogContent,
  type GeneratedExerciseContent,
  type GeneratedQuestionContent,
} from './schemas';

// ============================================================================
// TYPES
// ============================================================================

export type AIProvider = 'gemini' | 'groq';

export const AI_PROVIDERS: { id: AIProvider; name: string; model: string }[] = [
  { id: 'gemini', name: 'Gemini', model: 'gemini-2.5-flash' },
  { id: 'groq', name: 'Groq (Llama)', model: 'llama-3.3-70b-versatile' },
];

// Re-export types for convenience
export type {
  GeneratedContent,
  GeneratedBlogContent,
  GeneratedExerciseContent,
  GeneratedQuestionContent,
};

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({ apiKey });
}

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new Groq({ apiKey });
}

// ============================================================================
// GEMINI GENERATION - Using new SDK with JSON Schema
// ============================================================================

// Retry configuration
const GEMINI_MAX_RETRIES = 3;
const GEMINI_INITIAL_DELAY_MS = 1000;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (transient failure)
 */
function isRetryableError(message: string): boolean {
  const retryablePatterns = [
    '500', '502', '503', '504',  // Server errors
    'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',  // Network errors
    'timeout', 'network',  // Timeout/network issues
    'temporarily', 'overloaded',  // Temporary issues
  ];
  const lowerMessage = message.toLowerCase();
  return retryablePatterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()));
}

async function generateWithGemini(
  prompt: string,
  contentType: ContentType
): Promise<string> {
  console.log('[Gemini] Starting generation...');
  console.log('[Gemini] Content type:', contentType);
  console.log('[Gemini] API key exists:', !!process.env.GEMINI_API_KEY);

  const ai = getGeminiClient();
  const jsonSchema = getJsonSchemaForContentType(contentType);

  console.log('[Gemini] Using JSON Schema');
  console.log('[Gemini] Schema preview:', JSON.stringify(jsonSchema).substring(0, 200));

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      console.log(`[Gemini] Sending request (attempt ${attempt}/${GEMINI_MAX_RETRIES})...`);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // Use structured contents for more consistent output
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: jsonSchema as Parameters<typeof ai.models.generateContent>[0]['config'] extends { responseSchema?: infer T } ? T : never,
        },
      });

      // The new SDK returns text directly via response.text
      const text = response.text;

      console.log('[Gemini] Response received');
      console.log('[Gemini] Response length:', text?.length || 0);
      console.log('[Gemini] Response preview:', text?.substring(0, 300));

      if (!text || text.trim().length === 0) {
        throw new Error('Gemini returned an empty response. Please try again.');
      }

      return text;
    } catch (error: unknown) {
      const err = error as { message?: string };
      const message = err?.message || String(error);
      console.error(`[Gemini] Attempt ${attempt} failed:`, message);
      lastError = new Error(message);

      // Don't retry for non-retryable errors
      if (!isRetryableError(message)) {
        // Provide specific error messages for common issues
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
        if (message.includes('schema') || message.includes('Schema')) {
          throw new Error(`Gemini schema error: ${message}. The schema format may be incorrect.`);
        }

        throw new Error(`Gemini error: ${message}`);
      }

      // Wait before retry with exponential backoff
      if (attempt < GEMINI_MAX_RETRIES) {
        const delay = GEMINI_INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[Gemini] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw new Error(`Gemini error after ${GEMINI_MAX_RETRIES} attempts: ${lastError?.message}`);
}

// ============================================================================
// GROQ GENERATION - Using explicit JSON instructions in prompt
// ============================================================================

async function generateWithGroq(
  userPrompt: string,
  systemPrompt: string,
  contentType: ContentType
): Promise<string> {
  console.log('[Groq] Starting generation...');
  console.log('[Groq] Content type:', contentType);

  const groq = getGroqClient();
  const jsonTemplate = getJsonTemplateForContentType(contentType);

  // Build detailed field requirements based on content type
  const fieldRequirements =
    contentType === 'blog'
      ? `FIELD REQUIREMENTS:
- "title": Compelling, SEO-friendly article title (50-100 characters)
- "slug": URL-friendly slug derived from title (lowercase, hyphens only)
- "excerpt": 2-3 sentence summary for preview cards (150-200 characters)
- "body": Full article in markdown format with ## headings, code blocks, lists (minimum 1000 characters)
- "category": MUST be one of: Engineering, Tech, Tutorials, Study Guides, Certification Tips, News, Product
- "readingTime": Estimated minutes to read (calculate: word count / 200)
- "sources": Array of 2-3 credible reference URLs with titles`
      : contentType === 'exercise'
        ? `FIELD REQUIREMENTS:
- "title": Clear, descriptive exercise name
- "slug": URL-friendly slug (lowercase, hyphens only)
- "excerpt": Brief description of what the exercise teaches
- "body": Full markdown problem description with examples
- "starterCode": JavaScript/TypeScript starter code with helpful comments
- "solutionCode": Complete working solution
- "difficulty": MUST be one of: Beginner, Intermediate, Advanced
- "sources": Array of reference documentation URLs`
        : `FIELD REQUIREMENTS:
- "questionText": Clear, complete question text
- "options": Array of exactly 4 plausible answer options
- "correctAnswer": Index (0-3) of the correct option
- "explanation": Detailed explanation of why the answer is correct
- "sources": Array of reference documentation URLs`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}

OUTPUT FORMAT: You MUST respond with ONLY a valid JSON object.

EXACT JSON STRUCTURE REQUIRED:
${jsonTemplate}

${fieldRequirements}

CRITICAL RULES:
1. Output ONLY raw JSON - no markdown, no code fences, no explanatory text
2. Include ALL fields shown in the structure above
3. Every string field MUST have a non-empty value
4. The "sources" array MUST contain at least one object with "title" and "url"
5. Escape special characters in strings properly (quotes, newlines, etc.)
6. For markdown content in "body", use \\n for newlines`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // Lower temperature for more reliable JSON output
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '';
    console.log('[Groq] Response length:', content.length);
    console.log('[Groq] Response preview:', content.substring(0, 200));

    if (!content || content.trim().length === 0) {
      throw new Error('Groq returned an empty response. Please try again.');
    }

    return content;
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    console.error('[Groq] Full error:', error);
    const message = errorObj?.message || String(error);

    if (message.includes('invalid_api_key') || message.includes('401')) {
      throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY.');
    }
    if (message.includes('rate_limit') || message.includes('429')) {
      throw new Error('Groq rate limit exceeded. Try switching to Gemini or wait a moment.');
    }
    throw new Error(`Groq error: ${message}`);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract the first complete JSON value from a string using brace-matching.
 * This is more reliable than regex for handling nested braces in strings.
 */
function extractFirstJsonValue(input: string): string | null {
  const s = input.replace(/^\uFEFF/, '').trimStart(); // strip BOM, keep leading text handling

  const startObj = s.indexOf('{');
  const startArr = s.indexOf('[');
  const start =
    startObj === -1 ? startArr :
    startArr === -1 ? startObj :
    Math.min(startObj, startArr);

  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') { inString = true; continue; }

    if (ch === '{' || ch === '[') depth++;
    if (ch === '}' || ch === ']') depth = Math.max(0, depth - 1); // Guard against underflow

    if (depth === 0) return s.slice(start, i + 1).trim();
  }

  return null;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

function calculateReadingTime(body: string): number {
  const wordsPerMinute = 200;
  const wordCount = body.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

function sanitizeSources(
  sources: unknown
): Array<{ title: string; url: string }> {
  if (!Array.isArray(sources)) {
    console.warn('[Sanitize] Sources is not an array, returning empty');
    return [];
  }

  return sources
    .filter((source): source is { title: string; url: string } => {
      if (!source || typeof source !== 'object') return false;
      const s = source as Record<string, unknown>;
      return (
        typeof s.title === 'string' &&
        typeof s.url === 'string' &&
        s.title.trim().length > 0 &&
        s.url.trim().length > 0
      );
    })
    .map((source) => ({
      title: source.title.trim(),
      url: source.url.trim(),
    }));
}

// ============================================================================
// RESPONSE PARSING WITH ZOD VALIDATION
// ============================================================================

function parseAIResponse(
  text: string,
  contentType: ContentType
): GeneratedContent {
  console.log('[Parse] Starting parse, input length:', text?.length || 0);

  // Handle empty response
  if (!text || text.trim().length === 0) {
    console.error('[Parse] Empty response received');
    throw new Error('AI returned an empty response. Please try again.');
  }

  // Strip BOM and trim - BOM can cause JSON parse errors at position 0
  let jsonStr = text.replace(/^\uFEFF/, '').trim();
  console.log('[Parse] After BOM strip and trim, length:', jsonStr.length);

  // Only strip markdown code fences if they wrap the ENTIRE response (at the start)
  // Important: Don't match code fences inside JSON content (e.g., in markdown body fields)
  if (jsonStr.startsWith('```')) {
    console.log('[Parse] Found markdown code fence at start, extracting...');
    const jsonMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
  }

  // If response doesn't start with { or [, extract first complete JSON value using brace-matching
  // This is more reliable than greedy regex which can grab wrong slice when {} exists in strings
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    console.log('[Parse] Response does not start with JSON, extracting first JSON value...');
    const extracted = extractFirstJsonValue(jsonStr);
    if (!extracted) {
      throw new Error('AI response did not contain a valid JSON object/array.');
    }
    jsonStr = extracted;
  }

  console.log('[Parse] Final JSON length:', jsonStr.length);
  console.log('[Parse] First 300 chars:', jsonStr.substring(0, 300));

  // Debug: Check for control characters that can break JSON parsing
  // Exclude whitespace controls (\t=0x09, \n=0x0A, \r=0x0D) from the check
  const ctrl = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.exec(jsonStr);
  if (ctrl) {
    console.error('[Parse] Control char found:', ctrl[0], 'charCode:', ctrl[0].charCodeAt(0));
  }

  // Debug: Log character codes for first few characters
  if (jsonStr.length > 0) {
    const firstChars = Array.from(jsonStr.substring(0, 10))
      .map((c, i) => `${i}:'${c}'(${c.charCodeAt(0)})`)
      .join(' ');
    console.log('[Parse] First 10 char codes:', firstChars);
  }

  try {
    // Step 1: Parse JSON
    const parsed = JSON.parse(jsonStr);
    console.log('[Parse] JSON.parse succeeded');
    console.log('[Parse] Parsed keys:', Object.keys(parsed));

    // Step 2: Validate with Zod (safeParse won't throw)
    const zodSchema = getZodSchemaForContentType(contentType);
    const result = zodSchema.safeParse(parsed);

    if (!result.success) {
      console.warn('[Parse] Zod validation failed, applying fixes...');
      console.warn('[Parse] Errors:', result.error.issues);

      // Apply content-type-specific fixes for common issues
      return applyValidationFixes(parsed, contentType);
    }

    console.log('[Parse] Zod validation passed');
    console.log(
      '[Parse] Title:',
      (result.data as GeneratedBlogContent).title ||
        (result.data as GeneratedQuestionContent).questionText
    );

    return result.data as GeneratedContent;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Parse] Parse error:', err.message);

    // Provide specific error messages
    if (err.message?.includes('Unexpected token')) {
      const position = err.message.match(/position (\d+)/)?.[1];
      if (position) {
        const pos = parseInt(position, 10);
        const context = jsonStr.substring(Math.max(0, pos - 20), pos + 20);
        console.error(`[Parse] Error context around position ${pos}: "${context}"`);
      }
      throw new Error(
        `AI returned invalid JSON: ${err.message}. ` +
          `This may be due to special characters or formatting issues. Please try again.`
      );
    }

    throw new Error(`Failed to parse AI response: ${err.message}`);
  }
}

/**
 * Apply fixes for common validation issues
 */
function applyValidationFixes(
  parsed: Record<string, unknown>,
  contentType: ContentType
): GeneratedContent {
  console.log('[Fix] Applying validation fixes for:', contentType);

  if (contentType === 'blog') {
    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : null;

    const body =
      typeof parsed.body === 'string' && parsed.body.trim()
        ? parsed.body.trim()
        : null;

    if (!title) {
      throw new Error(
        'Generated content is missing a title. Please try again with a more specific prompt.'
      );
    }
    if (!body) {
      throw new Error(
        'Generated content is missing body text. Please try again with a more specific prompt.'
      );
    }

    const slug =
      typeof parsed.slug === 'string' && parsed.slug.trim()
        ? parsed.slug.trim()
        : generateSlug(title);

    const excerpt =
      typeof parsed.excerpt === 'string' && parsed.excerpt.trim()
        ? parsed.excerpt.trim()
        : body.replace(/[#*`]/g, '').substring(0, 150).trim() + '...';

    const validCategories = [
      'Engineering',
      'Tech',
      'Tutorials',
      'Study Guides',
      'Certification Tips',
      'News',
      'Product',
    ];
    let category =
      typeof parsed.category === 'string' ? parsed.category.trim() : 'Tech';
    if (!validCategories.includes(category)) {
      const lowerCategory = category.toLowerCase();
      const match = validCategories.find(
        (c) =>
          c.toLowerCase().includes(lowerCategory) ||
          lowerCategory.includes(c.toLowerCase())
      );
      category = match || 'Tech';
    }

    let readingTime =
      typeof parsed.readingTime === 'number' ? parsed.readingTime : null;
    if (!readingTime || readingTime < 1 || readingTime > 60) {
      readingTime = calculateReadingTime(body);
    }

    const sources = sanitizeSources(parsed.sources);

    console.log('[Fix] Blog content fixed');
    return { title, slug, excerpt, body, category, readingTime, sources };
  }

  if (contentType === 'exercise') {
    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : null;
    const body =
      typeof parsed.body === 'string' && parsed.body.trim()
        ? parsed.body.trim()
        : null;
    const starterCode =
      typeof parsed.starterCode === 'string' && parsed.starterCode.trim()
        ? parsed.starterCode.trim()
        : null;
    const solutionCode =
      typeof parsed.solutionCode === 'string' && parsed.solutionCode.trim()
        ? parsed.solutionCode.trim()
        : null;

    if (!title) throw new Error('Generated exercise is missing a title.');
    if (!body)
      throw new Error('Generated exercise is missing problem description.');
    if (!starterCode)
      throw new Error('Generated exercise is missing starter code.');
    if (!solutionCode)
      throw new Error('Generated exercise is missing solution code.');

    const slug =
      typeof parsed.slug === 'string' && parsed.slug.trim()
        ? parsed.slug.trim()
        : generateSlug(title);

    const excerpt =
      typeof parsed.excerpt === 'string' && parsed.excerpt.trim()
        ? parsed.excerpt.trim()
        : body.replace(/[#*`]/g, '').substring(0, 150).trim() + '...';

    const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
    let difficulty =
      typeof parsed.difficulty === 'string'
        ? parsed.difficulty.trim()
        : 'Intermediate';
    if (!validDifficulties.includes(difficulty)) {
      const lowerDiff = difficulty.toLowerCase();
      const match = validDifficulties.find((d) => d.toLowerCase() === lowerDiff);
      difficulty = match || 'Intermediate';
    }

    const sources = sanitizeSources(parsed.sources);

    console.log('[Fix] Exercise content fixed');
    return {
      title,
      slug,
      excerpt,
      body,
      starterCode,
      solutionCode,
      difficulty: difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
      sources,
    };
  }

  // Question content
  const questionText =
    typeof parsed.questionText === 'string' && parsed.questionText.trim()
      ? parsed.questionText.trim()
      : null;

  if (!questionText) {
    throw new Error('Generated question is missing question text.');
  }

  if (!Array.isArray(parsed.options) || parsed.options.length < 2) {
    throw new Error('Generated question must have at least 2 options.');
  }

  const options = parsed.options
    .slice(0, 4)
    .map((opt) => (typeof opt === 'string' ? opt.trim() : String(opt)));

  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`);
  }

  let correctAnswer =
    typeof parsed.correctAnswer === 'number' ? parsed.correctAnswer : 0;
  if (correctAnswer < 0 || correctAnswer >= options.length) {
    correctAnswer = 0;
  }

  const explanation =
    typeof parsed.explanation === 'string' && parsed.explanation.trim()
      ? parsed.explanation.trim()
      : 'The correct answer is option ' + (correctAnswer + 1) + '.';

  const sources = sanitizeSources(parsed.sources);

  console.log('[Fix] Question content fixed');
  return { questionText, options, correctAnswer, explanation, sources };
}

// ============================================================================
// MAIN EXPORT - Generate content with provider selection
// ============================================================================

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

  let rawResponse: string;

  if (provider === 'groq') {
    console.log('[Generate] Using Groq provider');
    rawResponse = await generateWithGroq(userPrompt, systemPrompt, contentType);
  } else {
    console.log('[Generate] Using Gemini provider');
    const fullPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`;
    console.log('[Generate] Full prompt length:', fullPrompt.length);
    rawResponse = await generateWithGemini(fullPrompt, contentType);
  }

  console.log('[Generate] Got raw response, length:', rawResponse?.length || 0);

  // Parse with content type for proper validation and fixes
  const result = parseAIResponse(rawResponse, contentType);
  console.log('[Generate] Parse and validation complete');

  return result;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isBlogContent(
  content: GeneratedContent
): content is GeneratedBlogContent {
  return 'body' in content && 'category' in content && 'readingTime' in content;
}

export function isExerciseContent(
  content: GeneratedContent
): content is GeneratedExerciseContent {
  return 'starterCode' in content && 'solutionCode' in content;
}

export function isQuestionContent(
  content: GeneratedContent
): content is GeneratedQuestionContent {
  return (
    'questionText' in content &&
    'options' in content &&
    'correctAnswer' in content
  );
}
