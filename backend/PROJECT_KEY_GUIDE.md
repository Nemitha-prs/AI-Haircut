# Understanding OpenAI Project Keys

## How Project Keys Work

When you create a key in an OpenAI **project**, that key is tied to that specific project. The key itself doesn't care about the project name - what matters is:

1. **The key is valid and active**
2. **The project has the right permissions**
3. **The project has access to the models you need** (like `gpt-4o-mini`)

## Project Name vs Key Validity

✅ **Project name doesn't matter** - You can name your project anything (e.g., "My App", "Test Project", "Haircut AI")

❌ **What DOES matter:**
- The key must be from an ACTIVE project
- The project must have access to the API
- The project must have credits/quota available
- The project must allow the models you're using

## Common Issues with Projects

### Issue 1: Key from Wrong Project
- **Problem:** You might have multiple projects and used a key from a different one
- **Solution:** Make sure you're creating the key in the project you want to use

### Issue 2: Project Doesn't Have Model Access
- **Problem:** Some projects might not have access to `gpt-4o-mini` or Vision API
- **Solution:** Check your project settings to ensure Vision models are enabled

### Issue 3: Project Has No Credits
- **Problem:** Project might be out of credits/quota
- **Solution:** Check your project's billing/usage page

## How to Verify Your Project Setup

### Step 1: Check Which Project You're In
1. Go to https://platform.openai.com/api-keys
2. Look at the top - it shows which project you're currently viewing
3. The project name is usually in a dropdown at the top

### Step 2: Create Key in the Right Project
1. Make sure you're in the project you want to use
2. Click "Create new secret key"
3. The key will be tied to THIS project

### Step 3: Verify Project Has Access
1. Go to your project settings
2. Check that you have:
   - API access enabled
   - Credits/quota available
   - Access to Vision models (gpt-4o-mini, gpt-4o, etc.)

## Best Practice

**Create a dedicated project for this app:**
1. Go to https://platform.openai.com
2. Create a new project (name it "Haircut AI" or anything you want)
3. Make sure it has:
   - API access
   - Credits/quota
   - Access to Vision models
4. Create a key in THIS project
5. Use that key in your `.env` file

## Testing Your Project Key

After creating a key, test it:

```bash
cd backend
node test-key.js
```

This will tell you if:
- ✅ The key is valid
- ✅ The project has the right permissions
- ✅ The models are accessible

## If You're Still Getting 401 Errors

Even with the correct project, you might get 401 if:

1. **Key was revoked** - Create a new key
2. **Project has no credits** - Add credits to your project
3. **Project restrictions** - Check project settings for any restrictions
4. **Key is incomplete** - Make sure you copied the entire key

## Summary

- **Project name doesn't matter** - Use any name you want
- **What matters:** Key is valid, project has access, project has credits
- **Best practice:** Create a dedicated project for this app
- **Test:** Always test your key with `node test-key.js`


