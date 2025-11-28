// Test script to verify OpenAI API key works
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Clear any existing OPENAI_API_KEY from environment
delete process.env.OPENAI_API_KEY;

// Load .env with override to ensure new values replace old ones
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const API_KEY = process.env.OPENAI_API_KEY;

console.log('🔍 Testing OpenAI Project Key...\n');

if (!API_KEY) {
  console.error('❌ ERROR: No project key found in .env file');
  console.log('\n💡 Make sure you have:');
  console.log('   1. Created a .env file in the backend directory');
  console.log('   2. Added: OPENAI_API_KEY=sk-proj-your-project-key-here');
  process.exit(1);
}

console.log(`Key preview: ${API_KEY.substring(0, 20)}...`);
console.log(`Key length: ${API_KEY.length} characters`);

const isProjectKey = API_KEY.startsWith('sk-proj-');
if (isProjectKey) {
  console.log(`Key type: Project Key ✅ (Correct!)\n`);
} else {
  console.log(`Key type: Regular API Key (Expected project key: sk-proj-...)\n`);
  console.log('⚠️  Warning: This app is configured for project keys.');
  console.log('   If you need to use a project key, get one from your OpenAI project.\n');
}

// Clean the key
const cleanedKey = API_KEY.trim().replace(/\s+/g, '');

// Validate format
if (!cleanedKey.startsWith('sk-')) {
  console.error('❌ ERROR: Invalid key format');
  console.error(`   Key should start with 'sk-proj-' (project key), but starts with: ${cleanedKey.substring(0, 10)}...`);
  process.exit(1);
}

if (!cleanedKey.startsWith('sk-proj-')) {
  console.warn('⚠️  Warning: Expected project key (sk-proj-), but got regular key.');
  console.warn('   Project keys are recommended for this application.\n');
}

// Test with a simple API call
const openai = new OpenAI({ apiKey: cleanedKey });

console.log('Testing API key with a simple request...\n');

try {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say "test successful" if you can read this.' }],
    max_tokens: 10,
  });
  
  console.log('✅ SUCCESS! Your API key is working!');
  console.log(`Response: ${response.choices[0].message.content}\n`);
  console.log('🎉 Your key is valid and active!');
  console.log('   You can now start the server with: npm start\n');
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error(`❌ API Error (${error.status}): ${error.message}\n`);
    
    if (error.status === 401) {
      console.error('🔴 AUTHENTICATION FAILED - Your project key is invalid or expired\n');
      console.log('Possible reasons:');
      console.log('1. Key was revoked or deleted in OpenAI project dashboard');
      console.log('2. Key is incomplete (missing characters)');
      console.log('3. Key has expired');
      console.log('4. Key has quotes or spaces in .env file');
      console.log('5. Project has no credits/quota available');
      console.log('6. Project doesn\'t have access to Vision models\n');
      console.log('💡 SOLUTION:');
      console.log('   1. Go to https://platform.openai.com/api-keys');
      console.log('   2. Make sure you\'re in the correct project');
      console.log('   3. Create a NEW project key');
      console.log('   4. Copy the ENTIRE key (starts with sk-proj-)');
      console.log('   5. Update your .env file (no quotes, no spaces)');
      console.log('   6. Verify project has credits and Vision API access');
      console.log('   7. Run this test again\n');
    } else if (error.status === 429) {
      console.error('⚠️  Rate limit exceeded - try again in a moment');
    } else {
      console.error('⚠️  Unexpected error - check your OpenAI account settings');
    }
  } else {
    console.error('❌ Error:', error.message);
  }
  process.exit(1);
}
