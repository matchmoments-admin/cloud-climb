// Test Gemini blog generation directly
// Run with: node test-gemini-blog.js

const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const blogSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    slug: { type: SchemaType.STRING },
    excerpt: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    readingTime: { type: SchemaType.NUMBER },
    sources: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
        },
        required: ['title', 'url'],
      },
    },
  },
  required: ['title', 'slug', 'excerpt', 'body', 'category', 'readingTime', 'sources'],
};

async function testGemini() {
  console.log('=== GEMINI BLOG GENERATION TEST ===\n');

  // Step 1: Check API Key
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('1. API Key Check:');
  console.log('   - Exists:', !!apiKey);
  console.log('   - Length:', apiKey?.length || 0);
  console.log('   - First 8 chars:', apiKey?.substring(0, 8) + '...');

  if (!apiKey) {
    console.error('\nERROR: GEMINI_API_KEY not found in .env.local');
    return;
  }

  // Step 2: Initialize client
  console.log('\n2. Initializing Gemini client...');
  const genAI = new GoogleGenerativeAI(apiKey);

  // Step 3: Configure model
  console.log('\n3. Configuring model with JSON schema...');
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: blogSchema,
    },
  });

  // Step 4: Send request
  console.log('\n4. Sending generation request...');
  console.log('   Prompt: "Write a short blog post about JavaScript basics"');

  const startTime = Date.now();

  try {
    const result = await model.generateContent(
      'Write a short blog post about JavaScript basics. Keep it under 500 words.'
    );

    const elapsed = Date.now() - startTime;
    console.log(`   Response received in ${elapsed}ms`);

    // Step 5: Extract response
    console.log('\n5. Extracting response...');
    const response = result.response;
    console.log('   Response object type:', typeof response);
    console.log('   Response keys:', Object.keys(response));

    const text = response.text();
    console.log('   Text type:', typeof text);
    console.log('   Text length:', text.length);

    // Step 6: Parse JSON
    console.log('\n6. Parsing JSON...');
    console.log('   First 300 chars:', text.substring(0, 300));

    const parsed = JSON.parse(text);
    console.log('\n7. Parsed successfully!');
    console.log('   Keys:', Object.keys(parsed));
    console.log('   Title:', parsed.title);
    console.log('   Slug:', parsed.slug);
    console.log('   Excerpt:', parsed.excerpt?.substring(0, 100) + '...');
    console.log('   Body length:', parsed.body?.length);
    console.log('   Category:', parsed.category);
    console.log('   Reading time:', parsed.readingTime);
    console.log('   Sources count:', parsed.sources?.length);

    if (parsed.sources?.length > 0) {
      console.log('   First source:', parsed.sources[0]);
    }

    console.log('\n=== TEST PASSED ===');

  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);

    if (error.message?.includes('API_KEY')) {
      console.error('\nAPI Key issue - check your key is valid');
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      console.error('\nRate limit issue - wait and try again');
    } else if (error.message?.includes('safety') || error.message?.includes('blocked')) {
      console.error('\nContent safety issue - try different prompt');
    }

    console.error('\nFull error:', error);
  }
}

testGemini();
