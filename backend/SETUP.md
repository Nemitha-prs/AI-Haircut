# OpenAI Project Key Setup

## Environment Variables

Create a `.env` file in the `backend` directory with your OpenAI project key:

```
OPENAI_API_KEY=sk-proj-your-project-key-here
```

### Getting Your OpenAI Project Key

1. Go to https://platform.openai.com/api-keys
2. Sign in to your OpenAI account
3. **Make sure you're in the correct project** (check the project dropdown at the top)
4. Click **"Create new secret key"**
5. Give it a name (optional, e.g., "Haircut AI App")
6. Click **"Create secret key"**
7. **IMMEDIATELY copy the key** (you won't see it again!)
8. Paste it into your `.env` file

**Important:** This application uses **project keys** (starts with `sk-proj-`), not regular API keys.

### Example `.env` file:

```
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567...
PORT=3000
```

**Important Format Rules:**
- ✅ NO quotes around the key
- ✅ NO spaces before or after the `=` sign
- ✅ Key must be on ONE line (no line breaks)
- ✅ Copy the ENTIRE key (usually 150+ characters)
- ✅ Key must start with `sk-proj-` (project key)

## Installation

Make sure all dependencies are installed:

```bash
cd backend
npm install
```

## Running the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on http://localhost:3000

## Testing Your Project Key

After adding your key to `.env`, test it:

```bash
cd backend
node test-key.js
```

You should see: **✅ SUCCESS! Your API key is working!**

## Troubleshooting

- **"Missing OPENAI_API_KEY"**: Make sure you've created a `.env` file in the `backend` directory
- **"Authentication failed (401)"**: 
  - Check that your project key is correct and complete
  - Make sure there are no quotes or spaces in the `.env` file
  - Verify the key is active in your OpenAI project
  - Check that your project has credits/quota available
  - Verify the project has access to Vision models (gpt-4o-mini)
  - Try creating a new project key
- **"Rate limit exceeded"**: You've hit OpenAI's rate limit. Wait a moment and try again
- **"Invalid key format"**: Make sure your key starts with `sk-proj-` (project key)

## Project Key Requirements

Your OpenAI project must have:
- ✅ API access enabled
- ✅ Credits/quota available
- ✅ Access to Vision models (gpt-4o-mini, gpt-4o, etc.)

## Verifying Your Project

1. Go to your OpenAI project dashboard
2. Check that:
   - API access is enabled
   - You have credits/quota
   - Vision models are accessible
3. Create a new project key if needed
