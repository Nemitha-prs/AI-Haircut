# Google OAuth & Brute-Force Protection Setup Guide

## ✅ What Was Added

### Backend Changes:
1. **New file**: `backend/routes/googleAuth.js` - Google OAuth 2.0 login flow
2. **Updated**: `backend/routes/auth.js` - Added brute-force protection (5 attempts → 5 min lock)
3. **Updated**: `backend/models/userStore.js` - Added helper methods for account locking
4. **Updated**: `backend/server.js` - Mounted Google auth routes (minimal append)
5. **Updated**: `backend/.env` - Added Google OAuth configuration variables

### Frontend Changes:
1. **Updated**: `frontend/login.html` - Added "Continue with Google" button + token extraction script

### Dependencies Added:
- `google-auth-library` (for OAuth 2.0)

---

## 🔧 Setup Instructions

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URI:
   ```
   http://localhost:3000/auth/google/callback
   ```
7. Copy your **Client ID** and **Client Secret**

### Step 2: Update .env File

Open `backend/.env` and replace the placeholder values:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### Step 3: Restart Server

```bash
cd backend
npm start
```

---

## 🚀 How It Works

### Google Login Flow:
1. User clicks "Continue with Google" on `login.html`
2. Browser redirects to `/auth/google`
3. Google OAuth consent screen appears
4. User approves → Google redirects to `/auth/google/callback`
5. Backend verifies token, creates/finds user, generates JWT
6. Redirects to `index.html?token=JWT_TOKEN`
7. Frontend extracts token from URL and saves to localStorage
8. User is logged in and redirected to main page

### Brute-Force Protection:
- **5 failed login attempts** → Account locked for **5 minutes**
- Error message shows remaining attempts
- Lock automatically expires after 5 minutes
- Successful login resets failed attempt counter

---

## 🔒 Security Features

✅ **Account Locking**: Users locked after 5 failed attempts  
✅ **Time-based Lock**: 5-minute automatic unlock  
✅ **JWT Tokens**: Secure session management  
✅ **Google OAuth**: No password storage for Google users  
✅ **User Feedback**: Clear error messages with attempt counts  

---

## 📝 User Data Structure

Users now have these additional fields:

```javascript
{
  id: "unique-id",
  email: "user@example.com",
  hashedPassword: "bcrypt-hash", // Empty for Google users
  freeDailyScans: 5,
  lastScanDate: null,
  failedLoginAttempts: 0,      // NEW
  lockUntil: null,              // NEW (timestamp)
  googleId: "google-user-id",   // NEW (Google users only)
  isGoogleUser: false           // NEW (true for Google users)
}
```

---

## 🧪 Testing

### Test Brute-Force Protection:
1. Go to `http://localhost:3000/login`
2. Enter correct email, wrong password 5 times
3. Should see: "Account locked for 5 minutes"
4. Wait 5 minutes → Try again → Should work

### Test Google Login:
1. Go to `http://localhost:3000/login`
2. Click "Continue with Google"
3. Select Google account
4. Should redirect to `index.html` with token
5. Check localStorage → Should have JWT token saved

---

## ⚠️ Important Notes

- **Existing code preserved**: All AI, haircut, and analysis logic untouched
- **Google users**: Auto-created with no password
- **Manual users**: Can still use email/password login
- **Production**: Change `JWT_SECRET` and use HTTPS for OAuth
- **Port conflicts**: If port 3000 is in use, stop other Node processes first

---

## 🐛 Troubleshooting

**"Missing GOOGLE_CLIENT_ID"**  
→ Add your Google credentials to `.env`

**"Account locked"**  
→ Wait 5 minutes or manually edit `backend/data/users.json` (set `lockUntil: null`)

**"Google login failed"**  
→ Check redirect URI matches exactly in Google Console

**Server won't start**  
→ Port 3000 in use. Stop other Node processes:
```powershell
Get-Process node | Stop-Process -Force
```

---

## ✨ What Was NOT Changed

- ❌ No changes to AI analysis logic
- ❌ No changes to haircut recommendation engine
- ❌ No changes to image processing
- ❌ No changes to existing frontend HTML/CSS/JS (except login.html additions)
- ❌ No changes to existing auth logic (only added checks)

All changes were **additive** and **minimal** to maintain existing functionality.
