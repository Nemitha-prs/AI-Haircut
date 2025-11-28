import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { analyzeFace } from '../services/openaiVision.js';
import { recommendHairstyles, createUserProfile } from '../services/hairstyleMatcher.js';

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

    // Validate that we got meaningful results
    if (analysis.faceShape === 'unknown' || analysis.gender === 'unknown' || analysis.ageGroup === 'unknown') {
      return res.status(400).json({ 
        error: 'Could not detect face attributes. Please ensure the image contains a clear face.' 
      });
    }

    // Create user profile from analysis
    const userProfile = createUserProfile(analysis);

    // Get hairstyle recommendations from database
    let recommendedStyles = [];
    try {
      recommendedStyles = await recommendHairstyles(userProfile, 6);
    } catch (dbError) {
      console.warn('Database not available or empty, using fallback:', dbError.message);
      // Fallback: return empty recommendations with message
      recommendedStyles = [];
    }

    // Return in the required format
    return res.json({
      userProfile: {
        ageGroup: userProfile.ageGroup,
        gender: userProfile.gender,
        faceShape: userProfile.faceShape,
        ethnicity: userProfile.ethnicity,
        jawShape: userProfile.jawShape,
        foreheadSize: userProfile.foreheadSize,
        hairlineShape: userProfile.hairlineShape,
        currentHairLength: userProfile.currentHairLength,
        hairType: userProfile.hairType,
        hairDensity: userProfile.hairDensity,
        skinTone: userProfile.skinTone,
        faceProportions: userProfile.faceProportions,
      },
      recommendedStyles: recommendedStyles.map(style => ({
        name: style.name,
        why_it_matches: style.why_it_matches || [],
        image: style.image,
        hairLength: style.hairLength,
        hairType: style.hairType,
        description: style.description,
      })),
      // Legacy fields for backward compatibility with frontend
      faceShape: userProfile.faceShape,
      gender: userProfile.gender,
      ageGroup: userProfile.ageGroup,
      ethnicity: userProfile.ethnicity,
      confidence: 0.95,
    });
  } catch (err) {
    console.error('analyze error', err);
    return res.status(500).json({ error: 'Analysis failed', detail: String(err) });
  }
});

export default router;
