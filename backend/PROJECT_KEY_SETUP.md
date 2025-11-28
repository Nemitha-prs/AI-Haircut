# How to Add Your OpenAI Project Key

## Step-by-Step Instructions

### 1. Locate Your `.env` File
The `.env` file should be in the `backend` directory:
```
AI-Haircut/
  └── backend/
      └── .env  ← This file
```

### 2. Open the `.env` File
Open `backend/.env` in a text editor (Notepad, VS Code, etc.)

### 3. Add Your OpenAI Project Key

**IMPORTANT FORMAT:**
- The key must be on a **single line** (no line breaks)
- No quotes around the key
- No spaces before or after the `=` sign
- The entire key must be present (usually 150+ characters)

**Correct Format:**
```
OPENAI_API_KEY=sk-proj-YourCompleteProjectKeyHereWithoutAnySpacesOrLineBreaks
```

**Example (what it should look like):**
```
OPENAI_API_KEY=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
```

### 4. Common Mistakes to Avoid

❌ **WRONG - Has quotes:**
```
OPENAI_API_KEY="sk-proj-..."
```

❌ **WRONG - Has spaces:**
```
OPENAI_API_KEY = sk-proj-...
```

❌ **WRONG - Key is split across multiple lines:**
```
OPENAI_API_KEY=sk-proj-abc123
xyz789
```

❌ **WRONG - Missing part of the key:**
```
OPENAI_API_KEY=sk-proj-abc123  (incomplete)
```

✅ **CORRECT - Single line, no quotes, no spaces:**
```
OPENAI_API_KEY=sk-proj-YourCompleteKeyHere
```

### 5. Save the File
Save the `.env` file after adding your key.

### 6. Restart the Server
**IMPORTANT:** After changing the `.env` file, you must restart your server:
1. Stop the server (Ctrl+C if running)
2. Start it again: `npm start`

### 7. Verify It's Working
The server should start without errors. If you see authentication errors, check:
- The key is complete (not cut off)
- No extra characters or spaces
- The key is on a single line
- You restarted the server after making changes

## Getting Your OpenAI Project Key

1. Go to https://platform.openai.com/api-keys
2. Make sure you're in the correct project
3. Click "Create new secret key" or use an existing project key
4. Copy the **entire** key (it's long - usually 150+ characters)
5. Paste it into your `.env` file following the format above

## Troubleshooting

**Error: "Missing OPENAI_API_KEY"**
- Make sure the `.env` file is in the `backend` directory
- Make sure the file is named exactly `.env` (not `.env.txt`)

**Error: "Authentication failed (401)"**
- Verify the key is complete (check if it got cut off when copying)
- Make sure there are no spaces or quotes
- Check that the key is still active in your OpenAI dashboard
- Try creating a new key if the old one might be revoked

**Error: "Invalid key format"**
- Project keys should start with `sk-proj-`
- Make sure you copied the entire key

## Need Help?

If you're still having issues:
1. Double-check the key format in your `.env` file
2. Make sure the key is from the correct OpenAI project
3. Verify the key hasn't been revoked in your OpenAI dashboard
4. Restart the server after making changes

