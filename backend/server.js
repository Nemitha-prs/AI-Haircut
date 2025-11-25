import dotenv from 'dotenv';

// Load environment variables ASAP before importing modules that read them
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Dynamically import the analyze router after env is loaded to avoid
// services reading uninitialised process.env during static import.
const { default: analyzeRouter } = await import('./routes/analyze.js');

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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


