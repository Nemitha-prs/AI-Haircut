import express from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, incrementFailedAttempts, resetFailedAttempts, isAccountLocked } from '../models/userStore.js';
import { signToken } from '../middleware/auth.js';

const router = express.Router();

function isValidEmail(email) {
  return typeof email === 'string' && /.+@.+\..+/.test(email);
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(password), salt);

    const user = await createUser({ email, hashedPassword });
    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (e) {
    if (String(e.message).includes('already')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    // Brute-force protection: check if account is locked
    if (isAccountLocked(user)) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({ error: `Account locked. Try again in ${remainingTime} minute(s)` });
    }

    const ok = await bcrypt.compare(String(password), user.hashedPassword || '');
    if (!ok) {
      await incrementFailedAttempts(user);
      const attemptsLeft = 5 - (user.failedLoginAttempts + 1);
      if (attemptsLeft > 0) {
        return res.status(401).json({ error: `Invalid email or password. ${attemptsLeft} attempt(s) remaining` });
      } else {
        return res.status(429).json({ error: 'Account locked for 5 minutes due to too many failed attempts' });
      }
    }

    // Successful login: reset failed attempts
    await resetFailedAttempts(user);

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email }, limits: { freeDailyScans: user.freeDailyScans || 5 } });
  } catch (e) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
