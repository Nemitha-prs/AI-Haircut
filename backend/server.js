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

// Dynamically import the analyze router after env is loaded to avoid
// services reading uninitialised process.env during static import.
const { default: analyzeRouter } = await import('./routes/analyze.js');

const app = express();
const PORT = process.env.PORT || 3000;

const frontendDir = path.join(__dirname, '..', 'frontend');

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(frontendDir));
app.get('/', (_req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

// Mount analyze route
app.use('/analyze', analyzeRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));


