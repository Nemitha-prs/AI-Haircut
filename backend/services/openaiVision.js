import OpenAI from 'openai';

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in environment variables. Please create a .env file in the backend directory with: OPENAI_API_KEY=your_key_here');
}

// Clean and validate the API key
const cleanedKey = API_KEY.trim().replace(/\s+/g, ''); // Remove all whitespace

// Validate key format (OpenAI project keys start with sk-proj-)
if (!cleanedKey.startsWith('sk-')) {
  throw new Error(`Invalid OpenAI project key format. Keys should start with 'sk-proj-'. Your key starts with: ${cleanedKey.substring(0, 10)}...`);
}

// Check if it's a project key
const isProjectKey = cleanedKey.startsWith('sk-proj-');
if (!isProjectKey) {
  console.warn('⚠️  Warning: Expected project key (sk-proj-), but got regular key. Project keys are recommended.');
}

// Initialize OpenAI client - works with OpenAI project keys (sk-proj-...)
const openai = new OpenAI({ 
  apiKey: cleanedKey
});


/**
 * Analyze face using OpenAI Vision API
 * @param {Buffer} imageBuffer - Image buffer to analyze
 * @returns {Promise<{ageGroup, gender, faceShape, ethnicity, jawShape, foreheadSize, hairlineShape, currentHairLength, hairType, hairDensity, skinTone, faceProportions}>}
 */
export async function analyzeFace(imageBuffer) {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Image buffer is empty');
  }

  // Convert buffer to base64
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg'; // We'll convert to JPEG if needed

  const prompt = `Analyze this face in detail and return ONLY JSON with these fields:

{
  "ageGroup": "child-boy | child-girl | teen-boy | teen-girl | adult-male | adult-female",
  "gender": "male | female",
  "faceShape": "round | oval | square | heart | diamond | long",
  "jawShape": "round | square | pointed | wide | narrow",
  "foreheadSize": "small | medium | large | wide | narrow",
  "hairlineShape": "straight | rounded | m-shaped | widow-peak | receding",
  "currentHairLength": "short | medium | long | very-short | very-long",
  "hairType": "straight | wavy | curly | coily | unknown",
  "hairDensity": "thin | medium | thick | very-thick",
  "skinTone": "light | medium | dark | very-light | very-dark",
  "ethnicity": "asian | african | caucasian | hispanic | middle-eastern | mixed | other",
  "faceProportions": {
    "faceLength": "short | medium | long",
    "cheekboneWidth": "narrow | medium | wide",
    "jawWidth": "narrow | medium | wide",
    "foreheadWidth": "narrow | medium | wide"
  }
}

Analyze:
- Face shape based on geometry (forehead width, cheekbone width, jaw width, face length)
- Jaw shape and structure
- Forehead size and width
- Hairline shape and pattern
- Current visible hair length and type
- Hair density and texture
- Skin tone
- Ethnicity based on visible facial features
- Face proportions (length, width measurements)

NO explanations. NO text outside JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const result = JSON.parse(content);

    // Validate and normalize the response
    const ageGroup = result.ageGroup || 'unknown';
    const gender = result.gender || 'unknown';
    const faceShape = result.faceShape || 'unknown';
    const ethnicity = result.ethnicity || 'unknown';
    const jawShape = result.jawShape || 'unknown';
    const foreheadSize = result.foreheadSize || 'unknown';
    const hairlineShape = result.hairlineShape || 'unknown';
    const currentHairLength = result.currentHairLength || 'unknown';
    const hairType = result.hairType || 'unknown';
    const hairDensity = result.hairDensity || 'unknown';
    const skinTone = result.skinTone || 'unknown';
    const faceProportions = result.faceProportions || {};

    // Normalize values
    const normalizedAgeGroup = normalizeAgeGroup(ageGroup);
    const normalizedGender = normalizeGender(gender);
    const normalizedFaceShape = normalizeFaceShape(faceShape);
    const normalizedEthnicity = normalizeEthnicity(ethnicity);
    const normalizedHairType = normalizeHairType(hairType);

    return {
      ageGroup: normalizedAgeGroup,
      gender: normalizedGender,
      faceShape: normalizedFaceShape,
      ethnicity: normalizedEthnicity,
      jawShape: normalizeJawShape(jawShape),
      foreheadSize: normalizeForeheadSize(foreheadSize),
      hairlineShape: normalizeHairlineShape(hairlineShape),
      currentHairLength: normalizeHairLength(currentHairLength),
      hairType: normalizedHairType,
      hairDensity: normalizeHairDensity(hairDensity),
      skinTone: normalizeSkinTone(skinTone),
      faceProportions: {
        faceLength: normalizeProportion(faceProportions.faceLength),
        cheekboneWidth: normalizeProportion(faceProportions.cheekboneWidth),
        jawWidth: normalizeProportion(faceProportions.jawWidth),
        foreheadWidth: normalizeProportion(faceProportions.foreheadWidth),
      },
    };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      // Provide more helpful error messages for common issues
      if (error.status === 401) {
        const keyPreview = cleanedKey.substring(0, 15) + '...';
        const isProjectKey = cleanedKey.startsWith('sk-proj-');
        const keyType = isProjectKey ? 'project key' : 'API key';
        throw new Error(`OpenAI API authentication failed (401). Your ${keyType} appears to be invalid or expired. Key preview: ${keyPreview}. Please verify:\n1. The key is copied completely (no missing characters)\n2. The key is on a single line in .env file\n3. There are no quotes around the key\n4. The key is active in your OpenAI project settings\n5. The project has credits/quota available`);
      } else if (error.status === 429) {
        throw new Error(`OpenAI API rate limit exceeded. Please try again later.`);
      } else if (error.status === 400) {
        throw new Error(`OpenAI API request error: ${error.message}`);
      }
      throw new Error(`OpenAI API error (${error.status}): ${error.message}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse OpenAI response: ${error.message}`);
    }
    throw error;
  }
}

function normalizeAgeGroup(ageGroup) {
  if (!ageGroup) return 'unknown';
  const s = String(ageGroup).toLowerCase().trim();
  const validGroups = ['child-boy', 'child-girl', 'teen-boy', 'teen-girl', 'adult-male', 'adult-female'];
  for (const valid of validGroups) {
    if (s === valid || s.includes(valid.replace('-', ' '))) {
      return valid;
    }
  }
  return 'unknown';
}

function normalizeGender(gender) {
  if (!gender) return 'unknown';
  const s = String(gender).toLowerCase().trim();
  if (s.startsWith('m') || s === 'male') return 'male';
  if (s.startsWith('f') || s === 'female') return 'female';
  return 'unknown';
}

function normalizeFaceShape(faceShape) {
  if (!faceShape) return 'unknown';
  const s = String(faceShape).toLowerCase().trim();
  const validShapes = ['round', 'oval', 'square', 'heart', 'diamond', 'long'];
  for (const valid of validShapes) {
    if (s === valid) return valid;
  }
  return 'unknown';
}

function normalizeEthnicity(ethnicity) {
  if (!ethnicity) return 'unknown';
  const s = String(ethnicity).toLowerCase().trim();
  const validEthnicities = ['asian', 'african', 'caucasian', 'hispanic', 'middle-eastern', 'mixed', 'other'];
  
  // Handle variations
  if (s.includes('asian') || s.includes('east asian') || s.includes('south asian')) return 'asian';
  if (s.includes('african') || s.includes('black')) return 'african';
  if (s.includes('caucasian') || s.includes('white') || s.includes('european')) return 'caucasian';
  if (s.includes('hispanic') || s.includes('latin')) return 'hispanic';
  if (s.includes('middle') || s.includes('arab')) return 'middle-eastern';
  if (s.includes('mixed') || s.includes('multi')) return 'mixed';
  
  for (const valid of validEthnicities) {
    if (s === valid) return valid;
  }
  return 'unknown';
}

function normalizeHairType(hairType) {
  if (!hairType) return 'unknown';
  const s = String(hairType).toLowerCase().trim();
  const validTypes = ['straight', 'wavy', 'curly', 'coily'];
  for (const valid of validTypes) {
    if (s === valid || s.includes(valid)) return valid;
  }
  return 'unknown';
}

function normalizeJawShape(jawShape) {
  if (!jawShape) return 'unknown';
  const s = String(jawShape).toLowerCase().trim();
  const valid = ['round', 'square', 'pointed', 'wide', 'narrow'];
  for (const v of valid) {
    if (s === v || s.includes(v)) return v;
  }
  return 'unknown';
}

function normalizeForeheadSize(foreheadSize) {
  if (!foreheadSize) return 'unknown';
  const s = String(foreheadSize).toLowerCase().trim();
  const valid = ['small', 'medium', 'large', 'wide', 'narrow'];
  for (const v of valid) {
    if (s === v || s.includes(v)) return v;
  }
  return 'unknown';
}

function normalizeHairlineShape(hairlineShape) {
  if (!hairlineShape) return 'unknown';
  const s = String(hairlineShape).toLowerCase().trim();
  const valid = ['straight', 'rounded', 'm-shaped', 'widow-peak', 'receding'];
  for (const v of valid) {
    if (s === v || s.includes(v)) return v;
  }
  return 'unknown';
}

function normalizeHairLength(hairLength) {
  if (!hairLength) return 'unknown';
  const s = String(hairLength).toLowerCase().trim();
  if (s.includes('very-short') || s.includes('very short')) return 'very-short';
  if (s.includes('very-long') || s.includes('very long')) return 'very-long';
  const valid = ['short', 'medium', 'long'];
  for (const v of valid) {
    if (s === v || s.includes(v)) return v;
  }
  return 'unknown';
}

function normalizeHairDensity(hairDensity) {
  if (!hairDensity) return 'unknown';
  const s = String(hairDensity).toLowerCase().trim();
  if (s.includes('very-thick') || s.includes('very thick')) return 'very-thick';
  const valid = ['thin', 'medium', 'thick'];
  for (const v of valid) {
    if (s === v || s.includes(v)) return v;
  }
  return 'unknown';
}

function normalizeSkinTone(skinTone) {
  if (!skinTone) return 'unknown';
  const s = String(skinTone).toLowerCase().trim();
  if (s.includes('very-light') || s.includes('very light')) return 'very-light';
  if (s.includes('very-dark') || s.includes('very dark')) return 'very-dark';
  const valid = ['light', 'medium', 'dark'];
  for (const v of valid) {
    if (s === v || s.includes(v)) return v;
  }
  return 'unknown';
}

function normalizeProportion(proportion) {
  if (!proportion) return 'unknown';
  const s = String(proportion).toLowerCase().trim();
  const valid = ['short', 'medium', 'long', 'narrow', 'wide'];
  for (const v of valid) {
    if (s === v || s.includes(v)) return v;
  }
  return 'unknown';
}


