import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { createUser, findUserByEmail, incrementFailedAttempts, resetFailedAttempts, isAccountLocked } from '../models/userStore.js';
import { signToken } from '../middleware/auth.js';

const router = express.Router();

const EMAIL_REGEX = /^(?![_.-])(?!.*[_.-]{2})([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;
const CODE_REGEX = /^\d{6}$/;
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3;
const MAX_VERIFY_ATTEMPTS = 5;

const verificationStore = new Map();

const {
  SMTP_SERVICE = 'gmail',
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '465',
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

if (!SMTP_USER || !SMTP_PASS) {
  console.warn('[Email] Missing SMTP_USER or SMTP_PASS in environment. Verification emails will fail.');
}

const transporter = nodemailer.createTransport({
  service: SMTP_SERVICE,
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    // Allow Gmail to negotiate TLS even if cert meta changes
    rejectUnauthorized: false,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error('[Email] Transport verification failed:', err.message);
  } else {
    console.log('[Email] Transport ready:', success);
  }
});

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function deliverVerificationCode(email, code) {
  console.log(`[Verification] deliverVerificationCode invoked for ${email}`);
  if (!transporter) {
    console.error('[Verification] Transporter is not initialized.');
    throw new Error('Email transporter not configured');
  }

  const fromAddress = SMTP_FROM || SMTP_USER;
  if (!fromAddress) {
    console.error('[Verification] Missing SMTP_FROM/SMTP_USER for from address.');
    throw new Error('Missing email sender configuration');
  }

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'Your HairCraft AI verification code',
    text: `Your HairCraft AI verification code is ${code}. It expires in 5 minutes.`,
    html: `
      <div style="font-family:Inter, Arial, sans-serif;"> 
        <p>Hello,</p>
        <p>Your HairCraft AI verification code is:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px;">${code}</p>
        <p>This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
      </div>
    `,
  };

  console.log('[Verification] Attempting to send email via transporter:', {
    service: SMTP_SERVICE,
    host: SMTP_HOST,
    port: SMTP_PORT,
    from: fromAddress,
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Verification] Email sent successfully:', info.response || info);
  } catch (err) {
    console.error('[Verification] Failed to send email:', err);
    throw err;
  }
}

function pruneRequestHistory(record) {
  const now = Date.now();
  record.requests = (record.requests || []).filter((ts) => now - ts < RATE_WINDOW_MS);
}

function ensureRecord(email) {
  if (!verificationStore.has(email)) {
    verificationStore.set(email, {
      requests: [],
      attempts: 0,
      verified: false,
    });
  }
  return verificationStore.get(email);
}

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });

    const existingUser = await findUserByEmail(email);
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    const record = ensureRecord(email);
    pruneRequestHistory(record);
    if (record.requests.length >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({ error: 'Too many verification attempts. Try again in 1 hour.' });
    }

    record.code = generateVerificationCode();
    record.expiresAt = Date.now() + CODE_TTL_MS;
    record.attempts = 0;
    record.verified = false;
    record.requests.push(Date.now());
    verificationStore.set(email, record);

    await deliverVerificationCode(email, record.code);
    return res.json({ message: 'Verification code sent' });
  } catch (e) {
    console.error('send-code error:', e);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
});

router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body || {};
    const target = isValidEmail(email) ? email : SMTP_USER;
    if (!target) return res.status(400).json({ error: 'Provide a valid email or configure SMTP_USER' });

    console.log(`[Email Test] Sending test message to ${target}`);
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: target,
      subject: 'HairCraft AI Test Email',
      text: 'This is a test email from HairCraft AI verification system.',
      html: '<p>This is a <strong>test email</strong> from HairCraft AI verification system.</p>',
    });

    res.json({ message: `Test email sent to ${target}` });
  } catch (err) {
    console.error('[Email Test] Failed to send test email:', err);
    res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

router.post('/verify-code', (req, res) => {
  const { email, code } = req.body || {};
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
  const normalizedCode = String(code || '').trim();
  if (!CODE_REGEX.test(normalizedCode)) return res.status(400).json({ error: 'Invalid verification code' });

  const record = verificationStore.get(email);
  if (!record || !record.code) {
    return res.status(400).json({ error: 'No verification code requested' });
  }

  if (record.expiresAt && record.expiresAt < Date.now()) {
    verificationStore.delete(email);
    return res.status(400).json({ error: 'Verification code expired' });
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    verificationStore.delete(email);
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (record.code !== normalizedCode) {
    record.attempts += 1;
    verificationStore.set(email, record);
    return res.status(400).json({ error: 'Incorrect verification code' });
  }

  record.verified = true;
  verificationStore.set(email, record);
  return res.json({ message: 'Email verified' });
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const verification = verificationStore.get(email);
    if (!verification || !verification.verified || (verification.expiresAt && verification.expiresAt < Date.now())) {
      return res.status(400).json({ error: 'Email not verified' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(password), salt);

    const user = await createUser({ email, hashedPassword });
    const token = signToken(user);
    verificationStore.delete(email);
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
