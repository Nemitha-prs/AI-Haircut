import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the backend directory
// Use override: true to ensure new values replace any existing ones
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

// Dynamically import routers and middleware after env is loaded
const { default: analyzeRouter } = await import('./routes/analyze.js');
// Safe appended imports for auth system (new files only)
const { default: authRouter } = await import('./routes/auth.js');
const { default: googleAuthRouter } = await import('./routes/googleAuth.js');
const { authMiddleware, requireAuth } = await import('./middleware/auth.js');
const { usageLimiter } = await import('./middleware/usageLimiter.js');

const app = express();
const PORT = process.env.PORT || 3000;

const frontendDir = path.join(__dirname, '..', 'frontend');

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(frontendDir));
app.get('/', (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')));
// Direct routes for key pages
app.get('/login', (_req, res) => res.sendFile(path.join(frontendDir, 'login.html')));
app.get('/signup', (_req, res) => res.sendFile(path.join(frontendDir, 'signup.html')));

// Auth routes (appended safely)
app.use('/auth', authRouter);
app.use('/auth', googleAuthRouter);

// Protect known AI endpoints without altering their internal logic
// If handlers exist elsewhere, these middleware will apply before them.
// Existing /analyze route is remounted below with middleware + original router.

// Protect generic endpoints (if they exist in the app):
app.use('/analyze-image', authMiddleware, usageLimiter);
app.use('/generate-hairstyles', authMiddleware, usageLimiter);
app.use('/chat', authMiddleware, usageLimiter);

// Re-mount analyze route with protection while preserving router logic
app.use('/analyze', authMiddleware, usageLimiter, analyzeRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));


