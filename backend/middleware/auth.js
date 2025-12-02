import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }

    // FIX: decode URL-encoded JWTs
    const rawToken = auth.split(' ')[1];
    const token = decodeURIComponent(rawToken);

    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email
    };

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
}

export const requireAuth = authMiddleware;

export function signToken(user) {
  const payload = { id: user.id, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
