import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const haircutsDir = path.join(__dirname, '..', 'haircuts');
let cached = null;

async function loadDataset() {
  if (cached) return cached;
  // Load the single unified database
  const dbPath = path.join(haircutsDir, 'hairstyleDatabase.json');
  try {
    const raw = await fs.readFile(dbPath, 'utf8');
    const arr = JSON.parse(raw);
    cached = arr.map(normalizeEntry);
    return cached;
  } catch (e) {
    console.error('Failed to load hairstyleDatabase.json:', e);
    return [];
  }
}

function normalizeEntry(e) {
  // Infer ageGroups from gender and tags
  let ageGroups = [];
  const g = (e.gender || '').toLowerCase();
  const tags = Array.isArray(e.tags) ? e.tags.map(t => t.toLowerCase()) : [];
  
  // Determine gender first
  let normalizedGender = 'unknown';
  if (g === 'female' || g.includes('girl') || g.includes('woman')) {
    normalizedGender = 'female';
  } else if (g === 'male' || g.includes('boy') || g.includes('man')) {
    normalizedGender = 'male';
  }
  
  // Then determine age groups
  if (g.includes('teen') || tags.includes('teen') || tags.includes('teenage')) {
    ageGroups = normalizedGender === 'male' ? ['teen-boy'] : ['teen-girl'];
  } else if (g.includes('child') || g.includes('kid') || tags.includes('child') || tags.includes('kids')) {
    ageGroups = normalizedGender === 'male' ? ['child-boy'] : ['child-girl'];
  } else if (normalizedGender === 'male') {
    // Default male styles work for both adults and teens
    ageGroups = ['adult-male', 'teen-boy'];
  } else if (normalizedGender === 'female') {
    // Default female styles work for both adults and teens
    ageGroups = ['adult-female', 'teen-girl'];
  } else {
    ageGroups = ['adult-male', 'adult-female'];
  }

  return {
    name: e.name || e.title || 'Unnamed',
    gender: normalizedGender,
    ageGroups: ageGroups,
    faceShapes: Array.isArray(e.faceShapes) ? e.faceShapes : (e.faceShapes ? [e.faceShapes] : (e.shape ? (Array.isArray(e.shape) ? e.shape : [e.shape]) : [])),
    ethnicity: Array.isArray(e.ethnicity) ? e.ethnicity : (e.ethnicity ? [e.ethnicity] : ['all']),
    hairLength: e.hairLength || e.length || 'medium',
    hairType: e.hairType || e.hairTypes?.[0] || e.type || 'straight',
    description: e.description || '',
    image: e.image || e.photo || '',
    raw: e,
  };
}

function uniqueByImage(arr) {
  const seen = new Set();
  const out = [];
  for (const a of arr) {
    if (!a.image) continue;
    if (seen.has(a.image)) continue;
    seen.add(a.image);
    out.push(a);
  }
  return out;
}

function scoreEntry(entry, { gender, ageGroup, faceShape, ethnicity }) {
  let score = 0;
  // Face shape match (most important)
  if (entry.faceShapes && faceShape && entry.faceShapes.includes(faceShape)) score += 4;
  // Age group match (very important)
  if (entry.ageGroups && ageGroup && entry.ageGroups.includes(ageGroup)) score += 3;
  // Gender match (important)
  if (entry.gender && gender && entry.gender === gender) score += 2;
  // Ethnicity match (bonus - if ethnicity is specified and matches, or if entry supports all ethnicities)
  if (ethnicity && ethnicity !== 'unknown') {
    if (entry.ethnicity && (entry.ethnicity.includes('all') || entry.ethnicity.includes(ethnicity))) {
      score += 1.5;
    }
  } else if (entry.ethnicity && entry.ethnicity.includes('all')) {
    score += 0.5; // Small bonus for universal styles
  }
  return score;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Recommend hairstyles with STRICT filtering.
 * SYSTEM INSTRUCTIONS:
 * 1. Gender must match exactly
 * 2. Age group must match exactly
 * 3. Face shape filtering is MANDATORY
 * 4. Hair type filtering is MANDATORY
 * 5. NO fallbacks that dilute filtering
 * 
 * options: { gender, ageGroup, faceShape, hairType, ethnicity, min, max }
 */
export async function recommend({ gender, ageGroup, faceShape, hairType, ethnicity, min = 6, max = 10 } = {}) {
  const dataset = await loadDataset();
  if (!dataset || dataset.length === 0) return [];

  // STRICT FILTERING - NO EXCEPTIONS
  let matches = dataset.filter(entry => {
    // 1. Gender must match exactly
    if (entry.gender !== gender) return false;

    // 2. Age group must match exactly
    if (!Array.isArray(entry.ageGroups) || !entry.ageGroups.includes(ageGroup)) return false;

    // 3. Face shape must match (MANDATORY)
    if (!Array.isArray(entry.faceShapes) || !entry.faceShapes.includes(faceShape)) return false;

    // 4. Hair type must match (MANDATORY) - if provided and not unknown
    if (hairType && hairType !== 'unknown') {
      const entryHairTypes = Array.isArray(entry.hairTypes) ? entry.hairTypes : 
                            (entry.hairType ? [entry.hairType] : []);
      if (entryHairTypes.length > 0 && !entryHairTypes.includes(hairType)) return false;
    }

    // 5. Ethnicity filter (optional - 'all' is universal)
    if (ethnicity && ethnicity !== 'unknown') {
      if (!Array.isArray(entry.ethnicity) || 
          (!entry.ethnicity.includes('all') && !entry.ethnicity.includes(ethnicity))) {
        return false;
      }
    }

    return true;
  });

  // If no matches, return empty array (NO FALLBACKS)
  if (matches.length === 0) return [];

  // Score and sort matches
  const scored = matches.map(entry => {
    const base = scoreEntry(entry, { gender, ageGroup, faceShape, ethnicity });
    const jitter = (Math.random() - 0.5) * 0.3; // Small variance for diversity
    return { entry, score: base + jitter };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return unique images only
  const unique = [];
  const seen = new Set();
  const targetCount = Math.min(max, matches.length);

  for (const s of scored) {
    if (!s.entry.image) continue;
    if (seen.has(s.entry.image)) continue;
    seen.add(s.entry.image);
    unique.push(Object.assign({ score: Math.round(s.score * 100) / 100 }, s.entry));
    if (unique.length >= targetCount) break;
  }

  // LIMIT TO TOP 5 SUGGESTIONS (final safeguard)
  if (unique.length > 5) {
    return unique.slice(0, 5);
  }

  return unique;
}

export default { loadDataset, recommend };
