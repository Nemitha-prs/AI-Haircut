import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import analyzeRouter from './routes/analyze.js';
import authRouter from './routes/auth.js';
import googleAuthRouter from './routes/googleAuth.js';
import { authMiddleware } from './middleware/auth.js';
import { usageLimiter } from './middleware/usageLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();

// Honor hosting PORT but default to 3000 for local dev
const PORT = Number(process.env.PORT) || 3000;

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

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
