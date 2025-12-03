import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

// Import routers and middleware
const { default: analyzeRouter } = await import('./routes/analyze.js');
const { default: authRouter } = await import('./routes/auth.js');
const { default: googleAuthRouter } = await import('./routes/googleAuth.js');
const { authMiddleware } = await import('./middleware/auth.js');
const { usageLimiter } = await import('./middleware/usageLimiter.js');

const app = express();

// ⭐ Koyeb expects your server to listen on port 3000
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Backend root
app.get('/', (_req, res) => {
  res.json({ status: 'Backend running' });
});

// Auth routes
app.use('/auth', authRouter);
app.use('/auth', googleAuthRouter);

// Protected AI endpoints
app.use('/analyze-image', authMiddleware, usageLimiter);
app.use('/generate-hairstyles', authMiddleware, usageLimiter);
app.use('/chat', authMiddleware, usageLimiter);

// Protected analyze route
app.use('/analyze', authMiddleware, usageLimiter, analyzeRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Start server on port 3000 (required by Koyeb)
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
