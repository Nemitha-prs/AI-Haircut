import OpenAI from 'openai';

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in environment variables');
}

const openai = new OpenAI({ apiKey: API_KEY });

/**
 * Analyze face using OpenAI Vision API
 * @param {Buffer} imageBuffer - Image buffer to analyze
 * @returns {Promise<{ageGroup: string, gender: string, faceShape: string}>}
 */
export async function analyzeFace(imageBuffer) {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Image buffer is empty');
  }

  // Convert buffer to base64
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg'; // We'll convert to JPEG if needed

  const prompt = `Analyze this face and return ONLY JSON with these fields:

{
  "ageGroup": "child-boy | child-girl | teen-boy | teen-girl | adult-male | adult-female",
  "gender": "male | female",
  "faceShape": "round | oval | square | heart | diamond | long"
}

Determine gender visually.
Determine age category visually.
Determine face shape based on geometry.

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
      max_tokens: 200,
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

    // Normalize values
    const normalizedAgeGroup = normalizeAgeGroup(ageGroup);
    const normalizedGender = normalizeGender(gender);
    const normalizedFaceShape = normalizeFaceShape(faceShape);

    return {
      ageGroup: normalizedAgeGroup,
      gender: normalizedGender,
      faceShape: normalizedFaceShape,
    };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
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

