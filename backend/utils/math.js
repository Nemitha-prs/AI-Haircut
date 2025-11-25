export function dist(a, b) {
  return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
}

// Rotate all landmarks around estimated eye-center to correct tilt
export function rotatePoints(landmarks = {}, rect = {}) {
  const get = (k) => landmarks[k] || null;
  const leftEye = get('left_eye_center') || get('left_eye_left_corner') || get('left_eye_right_corner');
  const rightEye = get('right_eye_center') || get('right_eye_right_corner') || get('right_eye_left_corner');

  const cx = ( (leftEye ? leftEye.x : (rect.left + rect.width/2)) + (rightEye ? rightEye.x : (rect.left + rect.width/2)) ) / 2;
  const cy = ( (leftEye ? leftEye.y : (rect.top + rect.height/3)) + (rightEye ? rightEye.y : (rect.top + rect.height/3)) ) / 2;

  let angle = 0;
  if (leftEye && rightEye) angle = Math.atan2((rightEye.y - leftEye.y), (rightEye.x - leftEye.x));
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  const out = {};
  for (const k of Object.keys(landmarks)) {
    const p = landmarks[k];
    const rx = p.x - cx;
    const ry = p.y - cy;
    out[k] = { x: rx * cos - ry * sin, y: rx * sin + ry * cos };
  }

  const topCenter = { x: (rect.left + (rect.width || 0) / 2) - cx, y: (rect.top || 0) - cy };
  out.__topCenter = { x: topCenter.x * cos - topCenter.y * sin, y: topCenter.x * sin + topCenter.y * cos };
  return out;
}
