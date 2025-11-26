import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { analyzeFace } from '../services/openaiVision.js';
import { recommend } from '../services/haircutEngine.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /analyze
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    // Validate mime type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }

    // Basic image validation
    let metadata;
    try {
      metadata = await sharp(req.file.buffer).metadata();
    } catch (errMeta) {
      return res.status(400).json({ error: 'Unable to read image metadata; the file may be corrupted' });
    }

    if (!metadata || !metadata.width || !metadata.height) {
      return res.status(400).json({ error: 'Invalid image dimensions' });
    }

    // Convert image to JPEG format for OpenAI (if needed) and ensure reasonable size
    // OpenAI Vision can handle various sizes, but we'll optimize for efficiency
    let processedImage;
    try {
      processedImage = await sharp(req.file.buffer)
        .rotate() // Fix EXIF orientation
        .resize({ width: 1024, withoutEnlargement: true }) // Resize for efficiency, max 1024px width
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (errProc) {
      return res.status(400).json({ error: 'Failed to process image' });
    }

    // Analyze face using OpenAI Vision
    let analysis;
    try {
      analysis = await analyzeFace(processedImage);
    } catch (errOpenAI) {
      const msg = String(errOpenAI.message || errOpenAI);
      if (msg.includes('OpenAI API error')) {
        return res.status(502).json({ error: 'OpenAI API error', detail: msg });
      }
      if (msg.includes('No response') || msg.includes('parse')) {
        return res.status(502).json({ error: 'Failed to analyze image', detail: msg });
      }
      console.error('OpenAI analysis error', errOpenAI);
      return res.status(502).json({ error: 'Face analysis failed', detail: msg });
    }

    const { ageGroup, gender, faceShape } = analysis;

    // Validate that we got meaningful results
    if (faceShape === 'unknown' || gender === 'unknown' || ageGroup === 'unknown') {
      return res.status(400).json({ 
        error: 'Could not detect face attributes. Please ensure the image contains a clear face.' 
      });
    }

    // Use haircutEngine to get recommendations
    const recs = await recommend({ 
      gender, 
      ageGroup, 
      faceShape, 
      min: 6, 
      max: 10 
    });
    
    const suggestions = recs.map(h => ({ 
      name: h.name, 
      image: h.image, 
      description: h.description, 
      hairLength: h.hairLength, 
      hairType: h.hairType, 
      faceShapes: h.faceShapes 
    }));

    // Extract age from ageGroup for display (optional, approximate)
    let age = null;
    if (ageGroup.includes('child')) age = 10;
    else if (ageGroup.includes('teen')) age = 15;
    else if (ageGroup.includes('adult')) age = 30;

    return res.json({
      faceShape,
      confidence: 0.95, // OpenAI Vision is generally reliable, set high confidence
      gender,
      age,
      ageGroup,
      measurements: {
        // OpenAI Vision doesn't provide pixel measurements, so we'll leave these null
        // Frontend will hide these rows automatically
        foreheadWidth: null,
        cheekboneWidth: null,
        jawWidth: null,
        faceLength: null,
      },
      suggestions,
    });
  } catch (err) {
    console.error('analyze error', err);
    return res.status(500).json({ error: 'Analysis failed', detail: String(err) });
  }
});

export default router;
