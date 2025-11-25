import fetch from 'node-fetch';
import FormData from 'form-data';

const FACEPP_URL = process.env.FACEPP_URL || 'https://api-us.faceplusplus.com/facepp/v3/detect';
const API_KEY = process.env.FACEPP_API_KEY;
const API_SECRET = process.env.FACEPP_API_SECRET;

export async function detectFaces(imageBuffer) {
  if (!API_KEY || !API_SECRET) throw new Error('Missing FACE++ API key/secret');
  const fd = new FormData();
  fd.append('api_key', API_KEY);
  fd.append('api_secret', API_SECRET);
  fd.append('return_landmark', '1');
  fd.append('return_attributes', 'gender,age,facequality,blur');
  fd.append('image_file', imageBuffer, { filename: 'upload.jpg' });

  const resp = await fetch(FACEPP_URL, { method: 'POST', body: fd, headers: fd.getHeaders ? fd.getHeaders() : {} });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error('Face++ error: ' + text);
  }
  const j = await resp.json();
  // Normalize faces array
  const faces = (j.faces || []).map(f => {
    return Object.assign({}, f, { landmark: f.landmark || f.landmark_position || {} });
  });
  return { raw: j, faces };
}
