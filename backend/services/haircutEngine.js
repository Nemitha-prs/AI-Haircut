import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const haircutsDir = path.join(__dirname, '..', 'haircuts');
let cached = null;

async function loadDataset() {
  if (cached) return cached;
  // Prefer a single combined file if present
  const combinedPath = path.join(haircutsDir, 'haircuts.json');
  try {
    const raw = await fs.readFile(combinedPath, 'utf8');
    const arr = JSON.parse(raw);
    cached = arr.map(normalizeEntry);
    return cached;
  } catch (e) {
    // Fall back to merging existing split files
  }

  // Read all files in haircuts dir
  let files = [];
  try {
    files = await fs.readdir(haircutsDir);
  } catch (e) {
    return [];
  }

  const mapping = {
    'adult_female.json': { gender: 'female', ageGroup: 'adult-female' },
    'adult_male.json': { gender: 'male', ageGroup: 'adult-male' },
    'child_boy.json': { gender: 'male', ageGroup: 'child-boy' },
    'child_girl.json': { gender: 'female', ageGroup: 'child-girl' },
    'teen_female.json': { gender: 'female', ageGroup: 'teen-girl' },
    'teen_male.json': { gender: 'male', ageGroup: 'teen-boy' },
  };

  let out = [];
  for (const f of files) {
    if (!f.toLowerCase().endsWith('.json')) continue;
    const full = path.join(haircutsDir, f);
    let raw = '';
    try {
      raw = await fs.readFile(full, 'utf8');
    } catch (e) {
      continue;
    }
    let arr = [];
    try {
      arr = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    const meta = mapping[f] || {};
    for (const e of arr) {
      const entry = Object.assign({}, e);
      // Normalize fields
      if (!entry.faceShapes && entry.shape) entry.faceShapes = entry.shape;
      if (!entry.ageGroups) entry.ageGroups = meta.ageGroup ? [meta.ageGroup] : entry.ageGroups || [];
      if (!entry.gender) entry.gender = meta.gender || entry.gender || (entry.ageGroups && entry.ageGroups.find(a => a.includes('male')) ? 'male' : 'female');
      // Keep description/image/name
      out.push(normalizeEntry(entry));
    }
  }
  cached = out;
  return cached;
}

function normalizeEntry(e) {
  return {
    name: e.name || e.title || 'Unnamed',
    gender: (e.gender || 'unknown').toLowerCase(),
    ageGroups: Array.isArray(e.ageGroups) ? e.ageGroups : (e.ageGroups ? [e.ageGroups] : []),
    faceShapes: Array.isArray(e.faceShapes) ? e.faceShapes : (e.faceShapes ? [e.faceShapes] : (e.shape ? (Array.isArray(e.shape) ? e.shape : [e.shape]) : [])),
    hairLength: e.hairLength || e.length || 'medium',
    hairType: e.hairType || e.type || 'straight',
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

function scoreEntry(entry, { gender, ageGroup, faceShape }) {
  let score = 0;
  if (entry.faceShapes && faceShape && entry.faceShapes.includes(faceShape)) score += 3;
  if (entry.ageGroups && ageGroup && entry.ageGroups.includes(ageGroup)) score += 3;
  if (entry.gender && gender && entry.gender === gender) score += 2;
  return score;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Recommend hairstyles.
 * options: { min:6, max:10 }
 */
export async function recommend({ gender, ageGroup, faceShape, min = 6, max = 10 } = {}) {
  const dataset = await loadDataset();
  if (!dataset || dataset.length === 0) return [];

  // 1. Filter by gender
  let candidates = dataset.filter(e => e.gender === (gender || e.gender));

  // 2. Filter by ageGroup
  candidates = candidates.filter(e => Array.isArray(e.ageGroups) && e.ageGroups.includes(ageGroup));

  // 3. Filter by faceShape: prefer exact matches, but if too few, include non-matching
  let faceMatches = candidates.filter(e => Array.isArray(e.faceShapes) && e.faceShapes.includes(faceShape));
  let nonFaceMatches = candidates.filter(e => !(Array.isArray(e.faceShapes) && e.faceShapes.includes(faceShape)));

  // If not enough faceMatches to satisfy max, keep some nonFaceMatches to increase diversity
  const wantCount = Math.max(min, Math.min(max, Math.floor(Math.random() * (max - min + 1)) + min));

  let pool = [];
  if (faceMatches.length >= wantCount) {
    pool = faceMatches;
  } else {
    // include all faceMatches and some of nonFaceMatches (shuffled)
    pool = faceMatches.slice();
    shuffleArray(nonFaceMatches);
    pool = pool.concat(nonFaceMatches.slice(0, Math.max(0, wantCount - pool.length)));
  }

  // Score each in pool
  const scored = pool.map(e => {
    const base = scoreEntry(e, { gender, ageGroup, faceShape });
    // slight random jitter so results vary
    const jitter = (Math.random() - 0.5) * 0.6; // +/-0.3
    return { entry: e, score: base + jitter };
  });

  // Sort by score desc
  scored.sort((a, b) => b.score - a.score);

  // Ensure unique images and take top wantCount
  const unique = [];
  const seen = new Set();
  for (const s of scored) {
    if (!s.entry.image) continue;
    if (seen.has(s.entry.image)) continue;
    seen.add(s.entry.image);
    unique.push(Object.assign({ score: Math.round(s.score * 100) / 100 }, s.entry));
    if (unique.length >= wantCount) break;
  }

  // If still not enough, fallback: broaden by dropping ageGroup filter
  if (unique.length < min) {
    // broaden candidates to same gender across ages
    let broad = dataset.filter(e => e.gender === (gender || e.gender));
    // score broad
    const scoredBroad = broad.map(e => ({ entry: e, score: scoreEntry(e, { gender, ageGroup, faceShape }) + (Math.random() - 0.5) * 0.4 }));
    scoredBroad.sort((a, b) => b.score - a.score);
    for (const s of scoredBroad) {
      if (!s.entry.image) continue;
      if (seen.has(s.entry.image)) continue;
      seen.add(s.entry.image);
      unique.push(Object.assign({ score: Math.round(s.score * 100) / 100 }, s.entry));
      if (unique.length >= min) break;
    }
  }

  return unique;
}

export default { loadDataset, recommend };
