import { dist, rotatePoints } from '../utils/math.js';

function safeGet(points, ...keys) {
  for (const k of keys) if (points[k]) return points[k];
  return null;
}

export function analyzeShape(landmarks = {}, rect = {}) {
  try {
    // Compute rotated landmarks to correct tilt
    const rotated = rotatePoints(landmarks, rect);

    const foreheadLeft = safeGet(rotated, 'contour_left1', 'contour_left2', 'left_eyebrow_left_corner');
    const foreheadRight = safeGet(rotated, 'contour_right1', 'contour_right2', 'right_eyebrow_right_corner');
    const foreheadWidth = (foreheadLeft && foreheadRight) ? Math.round(dist(foreheadLeft, foreheadRight)) : (rect.width || null);

    const cheekLeft = safeGet(rotated, 'contour_left4', 'left_cheek', 'contour_left3');
    const cheekRight = safeGet(rotated, 'contour_right4', 'right_cheek', 'contour_right3');
    const cheekWidth = (cheekLeft && cheekRight) ? Math.round(dist(cheekLeft, cheekRight)) : null;

    const jawLeft = safeGet(rotated, 'contour_left8', 'contour_left7');
    const jawRight = safeGet(rotated, 'contour_right8', 'contour_right7');
    const jawWidth = (jawLeft && jawRight) ? Math.round(dist(jawLeft, jawRight)) : null;

    const chin = safeGet(rotated, 'contour_chin', 'chin');
    const topCenter = rotated.__topCenter || { x: 0, y: -(rect.height || 0) / 2 };
    const faceLength = (chin) ? Math.round(dist(topCenter, chin)) : null;

    const measurements = {
      foreheadWidth: foreheadWidth || null,
      cheekboneWidth: cheekWidth || null,
      jawWidth: jawWidth || null,
      faceLength: faceLength || null,
    };

    // Ratios
    const primary = cheekWidth || foreheadWidth || jawWidth || null;
    const ratios = {};
    if (primary && faceLength) ratios.lengthToWidth = faceLength / primary;
    if (cheekWidth && jawWidth) ratios.jawToCheek = jawWidth / cheekWidth;
    if (foreheadWidth && cheekWidth) ratios.foreheadToCheek = foreheadWidth / cheekWidth;

    // Score candidates
    const scores = { round: 0, oval: 0, square: 0, heart: 0, diamond: 0, long: 0 };

    // round: length ~ width
    if (ratios.lengthToWidth) {
      const r = ratios.lengthToWidth;
      scores.round = Math.max(0, 1 - Math.abs(r - 1));
    }
    // oval: length > width moderately
    if (ratios.lengthToWidth) {
      const r = ratios.lengthToWidth;
      scores.oval = r > 1.05 && r < 1.7 ? Math.min(1, (r - 1.05) / 0.65) : 0;
    }
    // square: length ~ width and jaw strong
    if (ratios.lengthToWidth) {
      const r = ratios.lengthToWidth;
      scores.square = Math.max(0, 1 - Math.abs(r - 1));
      if (ratios.jawToCheek) scores.square *= (1 - Math.abs(ratios.jawToCheek - 1));
    }
    // heart: forehead wider than cheek, narrow jaw
    if (ratios.foreheadToCheek) {
      scores.heart = Math.max(0, (ratios.foreheadToCheek - 1) / 0.6);
    }
    if (ratios.jawToCheek) scores.heart *= Math.max(0, 1 - ratios.jawToCheek);

    // diamond: cheekbones much wider than forehead and jaw
    if (ratios.foreheadToCheek && ratios.jawToCheek) {
      const f = ratios.foreheadToCheek;
      const j = ratios.jawToCheek;
      scores.diamond = Math.max(0, (1 - f) + (1 - j));
    }

    // long: length >> width
    if (ratios.lengthToWidth) {
      const r = ratios.lengthToWidth;
      scores.long = r >= 1.6 ? Math.min(1, (r - 1.6) / 1.2 + 0.5) : 0;
    }

    // Normalize and choose best
    const norm = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.max(0, Math.min(1, v))]));
    let best = 'unknown';
    let bestScore = 0;
    for (const k of Object.keys(norm)) {
      if (norm[k] > bestScore) { bestScore = norm[k]; best = k; }
    }

    return { shape: best, confidence: Number(bestScore.toFixed(2)), measurements };
  } catch (e) {
    return { shape: 'unknown', confidence: 0, measurements: { foreheadWidth: null, cheekboneWidth: null, jawWidth: null, faceLength: null } };
  }
}
