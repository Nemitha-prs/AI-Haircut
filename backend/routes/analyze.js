import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { compressImage } from '../utils/imageTools.js';
import { detectFaces } from '../services/facepp.js';
import { estimateGenderAge } from '../services/genderAge.js';
import { analyzeShape } from '../services/faceShape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /analyze
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    // Validate mime
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(req.file.mimetype)) return res.status(400).json({ error: 'Unsupported image type' });

    // Compress/resize for Face++
    const compressed = await compressImage(req.file.buffer);

    // Send to Face++
    const facepp = await detectFaces(compressed);
    if (!facepp || !Array.isArray(facepp.faces) || facepp.faces.length === 0) {
      return res.status(400).json({ error: 'No face detected' });
    }

    // Choose largest face
    let chosen = facepp.faces[0];
    let maxArea = -1;
    for (const f of facepp.faces) {
      const r = f.face_rectangle || {};
      const area = (r.width || 0) * (r.height || 0);
      if (area > maxArea) {
        maxArea = area;
        chosen = f;
      }
    }

    const rect = chosen.face_rectangle || {};
    const landmarks = chosen.landmark || chosen.landmark_position || {};

    // Quality checks
    if ((rect.width || 0) < 30 || (rect.height || 0) < 30) {
      return res.status(400).json({ error: 'Face too small for reliable analysis' });
    }

    // Estimate gender/age (use Face++ attributes first then fallback)
    const attributes = chosen.attributes || {};
    const ga = await estimateGenderAge(attributes, compressed);
    const gender = ga.gender || 'unknown';
    const age = typeof ga.age === 'number' ? Math.round(ga.age) : null;

    // Determine ageGroup
    let ageGroup = 'unknown';
    if (age != null && gender === 'male' && age < 13) ageGroup = 'child-boy';
    else if (age != null && gender === 'female' && age < 13) ageGroup = 'child-girl';
    else if (age != null && age >= 13 && age <= 17 && gender === 'male') ageGroup = 'teen-boy';
    else if (age != null && age >= 13 && age <= 17 && gender === 'female') ageGroup = 'teen-girl';
    else if (age != null && age >= 18 && gender === 'male') ageGroup = 'adult-male';
    else if (age != null && age >= 18 && gender === 'female') ageGroup = 'adult-female';

    // Face-shape analysis
    const shapeResult = analyzeShape(landmarks, rect);

    // Load haircuts for ageGroup
    const haircutsPath = path.join(__dirname, '..', 'haircuts');
    const map = {
      'adult-male': 'adult_male.json',
      'adult-female': 'adult_female.json',
      'child-boy': 'child_boy.json',
      'child-girl': 'child_girl.json',
      'teen-boy': 'teen_male.json',
      'teen-girl': 'teen_female.json',
    };
    const fileName = map[ageGroup] || 'adult_female.json';
    const filePath = path.join(haircutsPath, fileName);
    let haircuts = [];
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      haircuts = JSON.parse(raw);
    } catch (e) {
      haircuts = [];
    }

    // Suggest haircuts: filter by shape if we have good confidence, otherwise return all
    let filtered = haircuts;
    if (shapeResult.shape !== 'unknown' && shapeResult.confidence >= 0.3) {
      filtered = haircuts.filter(h => Array.isArray(h.shape) && h.shape.includes(shapeResult.shape));
    }
    const suggestions = filtered.slice(0, 6).map(h => ({ name: h.name, image: h.image }));

    return res.json({
      faceShape: shapeResult.shape,
      confidence: shapeResult.confidence,
      gender,
      age,
      ageGroup,
      measurements: shapeResult.measurements,
      suggestions,
      raw: { facepp },
    });
  } catch (err) {
    console.error('analyze error', err);
    return res.status(500).json({ error: 'Analysis failed', detail: String(err) });
  }
});

export default router;
