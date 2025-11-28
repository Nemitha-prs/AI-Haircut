# AI Haircut Backend

Backend server for AI-powered haircut recommendations using OpenAI Vision API.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up OpenAI API Key

1. Get your API key from: https://platform.openai.com/api-keys
2. Create a `.env` file in the `backend` directory
3. Add your key:

```
OPENAI_API_KEY=sk-your-api-key-here
PORT=3000
```

**Important:** 
- Use a regular API key (starts with `sk-`)
- No quotes around the key
- No spaces before/after the `=` sign
- Key must be on one line

### 3. Test Your API Key

```bash
node test-key.js
```

You should see: **✅ SUCCESS! Your API key is working!**

### 4. Start the Server

```bash
npm start
```

Server will run on http://localhost:3000

## Documentation

- **SETUP.md** - Detailed setup instructions
- **API_KEY_SETUP.txt** - Quick reference guide
- **test-key.js** - Script to test your API key

## Troubleshooting

### Authentication Errors (401)

1. Verify your key is complete (not cut off)
2. Check no quotes/spaces in `.env` file
3. Create a new key in OpenAI dashboard
4. Restart server after changing `.env`

### Testing Your Key

Run `node test-key.js` to verify your key works before starting the server.

## API Endpoints

- `POST /analyze` - Analyze face and get haircut recommendations
- `GET /health` - Health check endpoint


