import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { createUser, findUserByEmail } from '../models/userStore.js';
import { signToken } from '../middleware/auth.js';

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !FRONTEND_BASE_URL) {
  console.warn('[GoogleAuth] Missing Google env vars');
}

const oauth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// STEP 1: Start Google OAuth
router.get('/google', (req, res) => {
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'select_account',
  });
  res.redirect(authorizeUrl);
});

// STEP 2: Google callback handler
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${FRONTEND_BASE_URL}/login.html?error=No+authorization+code`);
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      return res.redirect(`${FRONTEND_BASE_URL}/login.html?error=No+email+from+Google`);
    }

    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({
        email,
        hashedPassword: '',
        googleId: payload.sub,
        isGoogleUser: true,
      });
    }

    const token = signToken(user);
    const encodedToken = encodeURIComponent(token);

    return res.redirect(`${FRONTEND_BASE_URL}/login.html?token=${encodedToken}`);
  } catch (error) {
    console.error('[GoogleAuth] Error:', error);
    return res.redirect(`${FRONTEND_BASE_URL}/login.html?error=Google+login+failed`);
  }
});

export default router;
