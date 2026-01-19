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

  // Build detailed field requirements based on content type
  const fieldRequirements = contentType === 'blog'
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
      temperature: 0.7,
      max_tokens: 8192, // Increased to ensure complete content generation
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '';
    console.log('[Groq] Response length:', content.length);
    console.log('[Groq] Response preview:', content.substring(0, 200));
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

// Utility: Generate URL-friendly slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// Utility: Calculate reading time from body content
function calculateReadingTime(body: string): number {
  const wordsPerMinute = 200;
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

// Utility: Sanitize and validate sources array
function sanitizeSources(sources: unknown): Array<{ title: string; url: string }> {
  if (!Array.isArray(sources)) {
    console.warn('[Sanitize] Sources is not an array, returning empty');
    return [];
  }

  return sources
    .filter((source): source is { title: string; url: string } => {
      if (!source || typeof source !== 'object') return false;
      const s = source as Record<string, unknown>;
      return typeof s.title === 'string' && typeof s.url === 'string' &&
             s.title.trim().length > 0 && s.url.trim().length > 0;
    })
    .map(source => ({
      title: source.title.trim(),
      url: source.url.trim(),
    }));
}

// Validate and sanitize blog content with smart defaults
function validateBlogContent(parsed: Record<string, unknown>): GeneratedBlogContent {
  const title = typeof parsed.title === 'string' && parsed.title.trim()
    ? parsed.title.trim()
    : null;

  const body = typeof parsed.body === 'string' && parsed.body.trim()
    ? parsed.body.trim()
    : null;

  // Title and body are absolutely required - cannot generate defaults
  if (!title) {
    throw new Error('Generated content is missing a title. Please try again with a more specific prompt.');
  }
  if (!body) {
    throw new Error('Generated content is missing body text. Please try again with a more specific prompt.');
  }

  // Generate slug from title if missing
  const slug = typeof parsed.slug === 'string' && parsed.slug.trim()
    ? parsed.slug.trim()
    : generateSlug(title);

  // Generate excerpt from body if missing (first ~150 chars)
  const excerpt = typeof parsed.excerpt === 'string' && parsed.excerpt.trim()
    ? parsed.excerpt.trim()
    : body.replace(/[#*`]/g, '').substring(0, 150).trim() + '...';

  // Default category if missing or invalid
  const validCategories = ['Engineering', 'Tech', 'Tutorials', 'Study Guides', 'Certification Tips', 'News', 'Product'];
  let category = typeof parsed.category === 'string' ? parsed.category.trim() : 'Tech';
  if (!validCategories.includes(category)) {
    // Try to find a close match
    const lowerCategory = category.toLowerCase();
    const match = validCategories.find(c => c.toLowerCase().includes(lowerCategory) || lowerCategory.includes(c.toLowerCase()));
    category = match || 'Tech';
  }

  // Calculate reading time if missing or invalid
  let readingTime = typeof parsed.readingTime === 'number' ? parsed.readingTime : null;
  if (!readingTime || readingTime < 1 || readingTime > 60) {
    readingTime = calculateReadingTime(body);
  }

  const sources = sanitizeSources(parsed.sources);

  console.log('[Validate] Blog content validated:');
  console.log('[Validate]   - Title:', title.substring(0, 50));
  console.log('[Validate]   - Slug:', slug);
  console.log('[Validate]   - Body length:', body.length);
  console.log('[Validate]   - Category:', category);
  console.log('[Validate]   - Reading time:', readingTime);
  console.log('[Validate]   - Sources:', sources.length);

  return { title, slug, excerpt, body, category, readingTime, sources };
}

// Validate and sanitize exercise content with smart defaults
function validateExerciseContent(parsed: Record<string, unknown>): GeneratedExerciseContent {
  const title = typeof parsed.title === 'string' && parsed.title.trim()
    ? parsed.title.trim()
    : null;

  const body = typeof parsed.body === 'string' && parsed.body.trim()
    ? parsed.body.trim()
    : null;

  const starterCode = typeof parsed.starterCode === 'string' && parsed.starterCode.trim()
    ? parsed.starterCode.trim()
    : null;

  const solutionCode = typeof parsed.solutionCode === 'string' && parsed.solutionCode.trim()
    ? parsed.solutionCode.trim()
    : null;

  if (!title) {
    throw new Error('Generated exercise is missing a title.');
  }
  if (!body) {
    throw new Error('Generated exercise is missing problem description.');
  }
  if (!starterCode) {
    throw new Error('Generated exercise is missing starter code.');
  }
  if (!solutionCode) {
    throw new Error('Generated exercise is missing solution code.');
  }

  const slug = typeof parsed.slug === 'string' && parsed.slug.trim()
    ? parsed.slug.trim()
    : generateSlug(title);

  const excerpt = typeof parsed.excerpt === 'string' && parsed.excerpt.trim()
    ? parsed.excerpt.trim()
    : body.replace(/[#*`]/g, '').substring(0, 150).trim() + '...';

  const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
  let difficulty = typeof parsed.difficulty === 'string' ? parsed.difficulty.trim() : 'Intermediate';
  if (!validDifficulties.includes(difficulty)) {
    const lowerDiff = difficulty.toLowerCase();
    const match = validDifficulties.find(d => d.toLowerCase() === lowerDiff);
    difficulty = match || 'Intermediate';
  }

  const sources = sanitizeSources(parsed.sources);

  return { title, slug, excerpt, body, starterCode, solutionCode, difficulty, sources };
}

// Validate and sanitize question content
function validateQuestionContent(parsed: Record<string, unknown>): GeneratedQuestionContent {
  const questionText = typeof parsed.questionText === 'string' && parsed.questionText.trim()
    ? parsed.questionText.trim()
    : null;

  if (!questionText) {
    throw new Error('Generated question is missing question text.');
  }

  // Validate options array
  if (!Array.isArray(parsed.options) || parsed.options.length < 2) {
    throw new Error('Generated question must have at least 2 options.');
  }

  const options = parsed.options
    .slice(0, 4)
    .map(opt => typeof opt === 'string' ? opt.trim() : String(opt));

  // Ensure we have exactly 4 options, padding if necessary
  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`);
  }

  // Validate correct answer index
  let correctAnswer = typeof parsed.correctAnswer === 'number' ? parsed.correctAnswer : 0;
  if (correctAnswer < 0 || correctAnswer >= options.length) {
    correctAnswer = 0;
  }

  const explanation = typeof parsed.explanation === 'string' && parsed.explanation.trim()
    ? parsed.explanation.trim()
    : 'The correct answer is option ' + (correctAnswer + 1) + '.';

  const sources = sanitizeSources(parsed.sources);

  return { questionText, options, correctAnswer, explanation, sources };
}

// Detect content type from parsed response
function detectContentType(parsed: Record<string, unknown>): 'blog' | 'exercise' | 'question' {
  if ('questionText' in parsed) return 'question';
  if ('starterCode' in parsed || 'solutionCode' in parsed) return 'exercise';
  return 'blog';
}

// Parse JSON from AI response with comprehensive validation and sanitization
function parseAIResponse(text: string, expectedType?: ContentType): GeneratedContent {
  console.log('[Parse] Starting parse, input length:', text?.length || 0);

  // Handle empty response
  if (!text || text.trim().length === 0) {
    console.error('[Parse] Empty response received');
    throw new Error('AI returned an empty response. Please try regenerating.');
  }

  // Clean up response - remove markdown code fences if present
  let jsonStr = text.trim();

  // Try multiple patterns to extract JSON from potential markdown
  const patterns = [
    /```json\s*([\s\S]*?)```/,
    /```\s*([\s\S]*?)```/,
  ];

  for (const pattern of patterns) {
    const match = jsonStr.match(pattern);
    if (match) {
      console.log('[Parse] Extracted JSON from markdown code fence');
      jsonStr = match[1].trim();
      break;
    }
  }

  // Find JSON object boundaries (handles extra text before/after)
  const objectStart = jsonStr.indexOf('{');
  const objectEnd = jsonStr.lastIndexOf('}');

  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    jsonStr = jsonStr.substring(objectStart, objectEnd + 1);
  }

  console.log('[Parse] Final JSON length:', jsonStr.length);

  // Parse JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
    console.log('[Parse] JSON.parse succeeded, keys:', Object.keys(parsed));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parse error';
    console.error('[Parse] JSON.parse failed:', errorMessage);
    console.error('[Parse] First 500 chars:', jsonStr.substring(0, 500));
    throw new Error(`AI returned invalid JSON: ${errorMessage}. Please try regenerating.`);
  }

  // Detect content type if not provided
  const contentType = expectedType || detectContentType(parsed);
  console.log('[Parse] Content type:', contentType);

  // Validate and sanitize based on content type
  switch (contentType) {
    case 'blog':
      return validateBlogContent(parsed);
    case 'exercise':
      return validateExerciseContent(parsed);
    case 'question':
      return validateQuestionContent(parsed);
    default:
      return validateBlogContent(parsed);
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

  // Parse with content type for proper validation and defaults
  const result = parseAIResponse(text, contentType);
  console.log('[Generate] Parse and validation complete');

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
