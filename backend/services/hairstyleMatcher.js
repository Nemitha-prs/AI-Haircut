import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(__dirname, '..', 'haircuts', 'hairstyleDatabase.json');

let cachedDatabase = null;

/**
 * Load the hairstyle database from JSON file
 * @returns {Promise<Array>} Array of hairstyle entries
 */
async function loadDatabase() {
  if (cachedDatabase) return cachedDatabase;

  try {
    const raw = await fs.readFile(databasePath, 'utf8');
    // Remove comments (simple approach - remove lines starting with // or /* ... */)
    const cleaned = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    const database = JSON.parse(cleaned);
    
    if (!Array.isArray(database)) {
      throw new Error('Database must be an array');
    }

    cachedDatabase = database.filter(entry => {
      // Validate required fields
      return entry.name && 
             entry.description && 
             entry.image && 
             Array.isArray(entry.faceShapes) && 
             Array.isArray(entry.hairTypes) && 
             entry.hairLength && 
             entry.gender && 
             Array.isArray(entry.ethnicity);
    });

    return cachedDatabase;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('Hairstyle database not found. Please create hairstyleDatabase.json');
      return [];
    }
    throw error;
  }
}

/**
 * Calculate match score for a hairstyle based on user profile
 * @param {Object} hairstyle - Hairstyle entry from database
 * @param {Object} userProfile - User's face analysis profile
 * @returns {number} Match score (higher is better)
 */
function calculateMatchScore(hairstyle, userProfile) {
  let score = 0;

  // 1. FACE SHAPE COMPATIBILITY (HIGHEST PRIORITY - 40 points)
  if (hairstyle.faceShapes && Array.isArray(hairstyle.faceShapes)) {
    if (hairstyle.faceShapes.includes(userProfile.faceShape)) {
      score += 40; // Strongest match factor
    } else {
      return 0; // If face shape doesn't match, exclude (or give very low score)
    }
  }

  // 2. HAIR TYPE COMPATIBILITY (30 points)
  if (hairstyle.hairTypes && Array.isArray(hairstyle.hairTypes)) {
    if (hairstyle.hairTypes.includes('all') || 
        hairstyle.hairTypes.includes(userProfile.hairType)) {
      score += 30;
    } else {
      score -= 20; // Penalty for incompatible hair type
    }
  }

  // 3. AGE + GENDER SUITABILITY (20 points)
  if (hairstyle.gender === 'unisex' || hairstyle.gender === userProfile.gender) {
    score += 10;
  } else {
    score -= 15; // Penalty for wrong gender
  }

  if (hairstyle.ageGroups && Array.isArray(hairstyle.ageGroups)) {
    if (hairstyle.ageGroups.includes(userProfile.ageGroup)) {
      score += 10;
    }
  }

  // 4. ETHNICITY TEXTURE MATCH (15 points)
  if (hairstyle.ethnicity && Array.isArray(hairstyle.ethnicity)) {
    if (hairstyle.ethnicity.includes('all') || 
        hairstyle.ethnicity.includes(userProfile.ethnicity)) {
      score += 15;
    } else {
      score -= 5; // Small penalty
    }
  }

  // 5. VISUAL BALANCE RULES (10 points)
  // Check if hairstyle balances facial features
  if (userProfile.foreheadSize === 'large' && hairstyle.name.toLowerCase().includes('bangs')) {
    score += 5; // Bangs help balance large forehead
  }
  if (userProfile.jawShape === 'wide' && hairstyle.hairLength === 'long') {
    score += 5; // Long hair can soften wide jaw
  }
  if (userProfile.faceShape === 'round' && hairstyle.hairLength !== 'short') {
    score += 3; // Longer styles elongate round faces
  }

  // 6. HAIR LENGTH PREFERENCE (5 points)
  // If user has long hair, they might prefer similar length
  if (userProfile.currentHairLength && hairstyle.hairLength) {
    if (userProfile.currentHairLength === hairstyle.hairLength) {
      score += 3;
    }
  }

  return score;
}

/**
 * Generate why_it_matches reasons for a hairstyle
 * @param {Object} hairstyle - Hairstyle entry
 * @param {Object} userProfile - User's face analysis profile
 * @returns {Array<string>} Array of matching reasons
 */
function generateMatchReasons(hairstyle, userProfile) {
  const reasons = [];

  // Face shape match
  if (hairstyle.faceShapes && hairstyle.faceShapes.includes(userProfile.faceShape)) {
    reasons.push(`Perfect for ${userProfile.faceShape} face shapes`);
  }

  // Hair type match
  if (hairstyle.hairTypes && 
      (hairstyle.hairTypes.includes('all') || hairstyle.hairTypes.includes(userProfile.hairType))) {
    reasons.push(`Works well with ${userProfile.hairType} hair texture`);
  }

  // Age/gender match
  if (hairstyle.gender === 'unisex' || hairstyle.gender === userProfile.gender) {
    reasons.push(`Suitable for ${userProfile.gender} ${userProfile.ageGroup}`);
  }

  // Ethnicity match
  if (hairstyle.ethnicity && 
      (hairstyle.ethnicity.includes('all') || hairstyle.ethnicity.includes(userProfile.ethnicity))) {
    reasons.push(`Compatible with ${userProfile.ethnicity} hair characteristics`);
  }

  // Visual balance
  if (userProfile.foreheadSize === 'large' && hairstyle.name.toLowerCase().includes('bangs')) {
    reasons.push('Bangs help balance a larger forehead');
  }
  if (userProfile.jawShape === 'wide' && hairstyle.hairLength === 'long') {
    reasons.push('Long length softens strong jawline');
  }

  // Add description-based reason if available
  if (hairstyle.description) {
    reasons.push(hairstyle.description.substring(0, 100) + '...');
  }

  return reasons.slice(0, 3); // Return top 3 reasons
}

/**
 * Recommend hairstyles based on user profile
 * @param {Object} userProfile - User's face analysis profile
 * @param {number} count - Number of recommendations (default: 6)
 * @returns {Promise<Array>} Array of recommended hairstyles with match reasons
 */
export async function recommendHairstyles(userProfile, count = 6) {
  const database = await loadDatabase();

  if (database.length === 0) {
    return [];
  }

  // Score all hairstyles
  const scored = database.map(hairstyle => ({
    hairstyle,
    score: calculateMatchScore(hairstyle, userProfile),
  }));

  // Filter out negative scores (poor matches)
  const validMatches = scored.filter(item => item.score > 0);

  // Sort by score (highest first)
  validMatches.sort((a, b) => b.score - a.score);

  // Take top matches
  const topMatches = validMatches.slice(0, count);

  // Format results
  return topMatches.map(({ hairstyle, score }) => ({
    name: hairstyle.name,
    why_it_matches: generateMatchReasons(hairstyle, userProfile),
    image: hairstyle.image,
    hairLength: hairstyle.hairLength,
    hairType: hairstyle.hairTypes && hairstyle.hairTypes.length > 0 
      ? hairstyle.hairTypes[0] 
      : 'unknown',
    description: hairstyle.description,
    matchScore: Math.round(score), // For debugging
  }));
}

/**
 * Get user profile from face analysis
 * @param {Object} analysis - Face analysis result from OpenAI Vision
 * @returns {Object} Formatted user profile
 */
export function createUserProfile(analysis) {
  return {
    ageGroup: analysis.ageGroup || 'unknown',
    gender: analysis.gender || 'unknown',
    faceShape: analysis.faceShape || 'unknown',
    ethnicity: analysis.ethnicity || 'unknown',
    jawShape: analysis.jawShape || 'unknown',
    foreheadSize: analysis.foreheadSize || 'unknown',
    hairlineShape: analysis.hairlineShape || 'unknown',
    currentHairLength: analysis.currentHairLength || 'unknown',
    hairType: analysis.hairType || 'unknown',
    hairDensity: analysis.hairDensity || 'unknown',
    skinTone: analysis.skinTone || 'unknown',
    faceProportions: analysis.faceProportions || {},
  };
}

export default { recommendHairstyles, createUserProfile, loadDatabase };







