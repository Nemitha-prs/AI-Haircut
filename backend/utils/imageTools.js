import sharp from 'sharp';

const MAX_BYTES = parseInt(process.env.FACEPP_MAX_FILE_BYTES || process.env.MAX_FILE_BYTES || `${2 * 1024 * 1024}`, 10);
const MAX_WIDTH = parseInt(process.env.FACEPP_MAX_WIDTH || process.env.MAX_WIDTH || '2000', 10);

export async function compressImage(buffer) {
  // rotate to fix EXIF orientation, resize by width, convert to JPEG
  let q = 90;
  let out = await sharp(buffer).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: q }).toBuffer();
  while (out.length > MAX_BYTES && q >= 50) {
    q -= 10;
    out = await sharp(buffer).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).jpeg({ quality: q }).toBuffer();
  }
  return out;
}
