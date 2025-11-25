import fetch from 'node-fetch';

// Soft-voting gender & age estimator.
// Prefer Face++ attributes when present, but consult a secondary API if available
// and combine results to improve reliability. Returns { gender, age, source, confidence }.
export async function estimateGenderAge(faceAttributes = {}, imageBuffer = null) {
  const SECOND_API_URL = process.env.SECOND_AGE_GENDER_API_URL || null;
  const SECOND_API_KEY = process.env.SECOND_API_KEY || null;

  // Helper to normalize gender string
  const normGender = (g) => {
    if (!g) return 'unknown';
    const s = String((g.value || g)).toLowerCase();
    if (s.startsWith('m')) return 'male';
    if (s.startsWith('f')) return 'female';
    return 'unknown';
  };

  // Collect candidates
  const candidates = [];

  // Face++ attributes if present
  try {
    if (faceAttributes && (faceAttributes.gender || faceAttributes.age)) {
      const gender = normGender(faceAttributes.gender);
      const ageRaw = faceAttributes.age && (faceAttributes.age.value || faceAttributes.age);
      const age = (typeof ageRaw === 'number') ? ageRaw : (ageRaw ? Number(ageRaw) : null);
      candidates.push({ source: 'facepp', gender, age, weight: 0.7 });
    }
  } catch (e) {
    // ignore
  }

  // Secondary API (optional)
  if (SECOND_API_URL && imageBuffer) {
    try {
      const resp = await fetch(SECOND_API_URL, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, SECOND_API_KEY ? { Authorization: `Bearer ${SECOND_API_KEY}` } : {}),
        body: JSON.stringify({ image_base64: imageBuffer.toString('base64') }),
      });
      if (resp.ok) {
        const j = await resp.json();
        const gender = j.gender ? (String(j.gender).toLowerCase().startsWith('m') ? 'male' : (String(j.gender).toLowerCase().startsWith('f') ? 'female' : 'unknown')) : 'unknown';
        const age = (typeof j.age === 'number') ? j.age : (j.age && typeof j.age.value === 'number' ? j.age.value : null);
        candidates.push({ source: 'secondary', gender, age, weight: 0.5 });
      }
    } catch (e) {
      // ignore secondary failures
    }
  }

  // If we have no candidates, return unknown
  if (!candidates.length) return { gender: 'unknown', age: null, source: 'none', confidence: 0 };

  // Aggregate gender by weighted votes
  const genderScores = { male: 0, female: 0, unknown: 0 };
  let ageSum = 0, ageWeight = 0;
  for (const c of candidates) {
    const w = c.weight || 0.5;
    genderScores[c.gender || 'unknown'] = (genderScores[c.gender || 'unknown'] || 0) + w;
    if (typeof c.age === 'number') { ageSum += c.age * w; ageWeight += w; }
  }

  const finalGender = genderScores.male > genderScores.female ? 'male' : (genderScores.female > genderScores.male ? 'female' : 'unknown');
  const genderConfidence = Math.max(genderScores.male, genderScores.female) / Math.max(1, (genderScores.male + genderScores.female + genderScores.unknown));
  const finalAge = ageWeight ? Math.round(ageSum / ageWeight) : null;
  const ageConfidence = ageWeight ? Math.min(0.99, Math.max(0.2, ageWeight / candidates.length)) : 0;

  // Build source string summarizing members
  const source = candidates.map(c => c.source).join(',');

  return { gender: finalGender, age: finalAge, source, confidence: { gender: Number(genderConfidence.toFixed(2)), age: Number(ageConfidence.toFixed(2)) } };
}
