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

    // STRICT FACE VALIDATION — reject ANY image without a real, single human face
    if (!analysis || typeof analysis !== "object") {
      return res.status(400).json({
        success: false,
        error: "Unable to analyze the image. Please upload a clear photo with a human face."
      });
    }

    // No face detected at all
    if (analysis.noFaceDetected === true ||
        analysis.faceDetected === false ||
        analysis.faceCount === 0 ||
        !analysis.faceShape) {
      return res.status(400).json({
        success: false,
        error: "No face detected. Please upload a clear photo with a human face."
      });
    }

    // Multiple faces detected
    if (analysis.multipleFaces === true ||
        (typeof analysis.faceCount === "number" && analysis.faceCount > 1)) {
      return res.status(400).json({
        success: false,
        error: "Multiple faces detected. Please upload a photo with only one face."
      });
    }

    // Face exists but model is uncertain or outputs default/fallback values
    const invalidFaceShapes = ["unknown", "uncertain", "none", null, undefined];
    if (!analysis.faceShape || invalidFaceShapes.includes(String(analysis.faceShape).toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: "Face not recognized clearly. Please upload a well-lit photo with a visible face."
      });
    }

    // Strict quality checks
    if (
      analysis.tooBlurry === true ||
      analysis.imageQuality === "poor" ||
      analysis.imageQuality === "blurry" ||
      analysis.confidence < 0.5
    ) {
      return res.status(400).json({
        success: false,
        error: "Image quality is too low. Please upload a clear, high-quality face photo."
      });
    }

    // IMAGE ERROR HANDLING: Check if face detection was successful
    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Unable to analyze the image. Please upload a clear photo with one face.'
      });
    }

    // Check for no face detected
    if (analysis.noFaceDetected === true || analysis.faceDetected === false) {
      return res.status(400).json({
        success: false,
        error: 'Unable to detect a face in the image. Please upload a clear photo with one face.'
      });
    }

    // Check for multiple faces
    if (analysis.multipleFaces === true || (analysis.faceCount && analysis.faceCount > 1)) {
      return res.status(400).json({
        success: false,
        error: 'Multiple faces detected. Please upload a photo with only one face.'
      });
    }

    // Check for image quality issues
    if (analysis.tooBlurry === true || analysis.imageQuality === 'poor' || analysis.imageQuality === 'blurry') {
      return res.status(400).json({
        success: false,
        error: 'Image quality is too low or blurry. Please upload a clearer photo.'
      });
    }

    // If face presence is unclear, require explicit single face detection
    if (analysis.faceCount === 0 || analysis.faceDetected === false) {
      return res.status(400).json({
        success: false,
        error: 'Unable to detect a face in the image. Please upload a clear photo with one face.'
      });
    }
    if (typeof analysis.faceCount === 'number' && analysis.faceCount !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Multiple faces detected. Please upload a photo with only one face.'
      });
    }

    // Check if essential analysis fields are missing
    if (!analysis.gender && !analysis.faceShape && !analysis.ageGroup) {
      return res.status(400).json({
        success: false,
        error: 'Unable to extract face features from the image. Please upload a clear, well-lit photo.'
      });
    }

    // Coerce analysis fields to strict allowed categories
    const allowedGender = ['male', 'female'];
    const allowedAge = ['adult-male', 'adult-female', 'teen-boy', 'teen-girl', 'child-boy', 'child-girl'];
    const allowedFace = ['round', 'oval', 'square', 'heart', 'diamond', 'long'];
    const allowedHair = ['straight', 'wavy', 'curly', 'coily'];

    const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

    const gender = pick(String(analysis.gender || '').toLowerCase(), allowedGender, 'male');
    const ageGroup = pick(String(analysis.ageGroup || '').toLowerCase(), allowedAge, gender === 'female' ? 'adult-female' : 'adult-male');
    const faceShape = pick(String(analysis.faceShape || '').toLowerCase(), allowedFace, 'oval');
    const hairType = pick(String(analysis.hairType || '').toLowerCase(), allowedHair, 'straight');

    // Get hairstyle recommendations from database using haircutEngine
    let recommendedStyles = [];
    try {
      const recommendations = await recommend({
        gender,
        ageGroup,
        faceShape,
        hairType, // STRICT: include hairType filtering
        ethnicity: analysis.ethnicity || 'unknown',
        min: 6,
        max: 10
      });
      
      // FINAL STRICT FILTER (belt-and-suspenders):
      // Ensure exact match on gender, ageGroup, faceShape, hairType before mapping
      const strictlyFiltered = recommendations.filter(style => {
        const hairTypes = Array.isArray(style.hairTypes) ? style.hairTypes : (style.hairType ? [style.hairType] : []);
        return (
          style.gender === gender &&
          Array.isArray(style.ageGroups) && style.ageGroups.includes(ageGroup) &&
          Array.isArray(style.faceShapes) && style.faceShapes.includes(faceShape) &&
          (hairType === 'unknown' || hairTypes.includes(hairType))
        );
      });

      // Format recommendations to match expected structure
      recommendedStyles = strictlyFiltered.map(style => ({
        name: style.name,
        image: style.image,
        hairLength: style.hairLength,
        hairType: style.hairType,
        description: style.description,
        why_it_matches: [
          `Perfect for ${faceShape} face shapes`,
          `Suitable for ${gender} ${ageGroup}`,
          style.description
        ].filter(Boolean)
      }));

      // LIMIT TO TOP 5 SUGGESTIONS
      if (recommendedStyles.length > 5) {
        recommendedStyles = recommendedStyles.slice(0, 5);
      }
    } catch (dbError) {
      console.warn('Database error:', dbError.message);
      recommendedStyles = [];
    }

    // Return in the required format
    return res.json({
      userProfile: {
        ageGroup,
        gender,
        faceShape,
        ethnicity: analysis.ethnicity,
        jawShape: analysis.jawShape,
        foreheadSize: analysis.foreheadSize,
        hairlineShape: analysis.hairlineShape,
        currentHairLength: analysis.currentHairLength,
        hairType,
        hairDensity: analysis.hairDensity,
        skinTone: analysis.skinTone,
        faceProportions: analysis.faceProportions,
      },
      recommendedStyles: recommendedStyles.map(style => ({
        name: style.name,
        why_it_matches: style.why_it_matches || [],
        image: style.image,
        hairLength: style.hairLength,
        hairType: style.hairType,
        description: style.description,
      })),
      // Frontend expects `suggestions` for display
      suggestions: recommendedStyles,
      // Legacy fields for backward compatibility with frontend
      faceShape,
      gender,
      ageGroup,
      ethnicity: analysis.ethnicity,
      confidence: 0.95,
    });
  } catch (err) {
    console.error('analyze error', err);
    return res.status(500).json({ error: 'Analysis failed', detail: String(err) });
  }
});

export default router;
