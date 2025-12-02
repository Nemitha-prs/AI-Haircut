import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { createUser, findUserByEmail } from '../models/userStore.js';
import { signToken } from '../middleware/auth.js';

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

const oauth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Initiate Google OAuth flow
router.get('/google', (req, res) => {
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'select_account'
  });
  res.redirect(authorizeUrl);
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect('/login.html?error=No authorization code');
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    if (!email) {
      return res.redirect('/login.html?error=No email from Google');
    }

    // Find or create user
    let user = await findUserByEmail(email);
    if (!user) {
      // Auto-create user from Google login
      user = await createUser({
        email,
        hashedPassword: '', // No password for Google users
        googleId: payload.sub,
        isGoogleUser: true
      });
    }

    // Generate JWT
    const token = signToken(user);

    // Redirect to frontend with token
    res.redirect(`/index.html?token=${token}`);
  } catch (error) {
    console.error('Google auth error:', error);
    res.redirect('/login.html?error=Google login failed');
  }
});

export default router;
