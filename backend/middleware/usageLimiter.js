import { findUserByEmail, updateUser } from '../models/userStore.js';

function todayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function usageLimiter(req, res, next) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }
    let user = await findUserByEmail(req.user.email);
    if (!user) return res.status(401).json({ error: 'Unauthorized access' });

    // Unlimited account must bypass everything (before any checks)
    const unlimitedEmail = 'nemithaprs@gmail.com';
    if (String(user.email).toLowerCase() === unlimitedEmail || user.unlimited === true) {
      return next();
    }

    const today = todayString();
    
    // Reset daily attempts when date changes (per-account)
    if (!user.lastScanDate || user.lastScanDate !== today) {
      user.lastScanDate = today;
      user.attemptsToday = 3; // canonical field
      user.freeDailyScans = 3; // keep legacy in sync
      user = await updateUser(user); // persist and refresh
    }

    // Resolve available attempts (prefer attemptsToday, fallback to legacy)
    const attemptsAvailable = typeof user.attemptsToday === 'number' ? user.attemptsToday : (user.freeDailyScans ?? 0);

    // Check if user has attempts remaining
    if (attemptsAvailable <= 0) {
      return res.status(429).json({ 
        success: false,
        error: 'Daily limit reached. Please wait until tomorrow.' 
      });
    }

    // Decrement ONLY after successful completion of the route
    const allowedPaths = [
      '/analyze',
      '/api/analyze',
      '/analyze-image',
      '/api/analyze-image',
      '/generate-hairstyles',
      '/api/generate-hairstyles'
    ];
    const urlToCheck = (req.originalUrl || req.url || '').toLowerCase();
    const shouldCount = allowedPaths.some(p => urlToCheck.startsWith(p));

    // Attach a finish listener to decrement if response was successful
    if (shouldCount) {
      res.on('finish', async () => {
        try {
          // Consider success for 2xx responses only
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const latest = await findUserByEmail(req.user.email);
            if (!latest) return;
            // Re-check date to avoid race conditions across midnight
            const nowStr = todayString();
            if (String(latest.email).toLowerCase() === unlimitedEmail || latest.unlimited === true) {
              return; // do not decrement unlimited
            }
            if (latest.lastScanDate !== nowStr) {
              latest.lastScanDate = nowStr;
              latest.attemptsToday = 3;
              latest.freeDailyScans = 3;
            }
            const avail = typeof latest.attemptsToday === 'number' ? latest.attemptsToday : (latest.freeDailyScans ?? 0);
            if (avail > 0) {
              const newAttempts = avail - 1;
              latest.attemptsToday = newAttempts;
              latest.freeDailyScans = newAttempts;
              await updateUser(latest);
            }
          }
        } catch (e) {
          // Silent fail; do not block response
        }
      });
    }

    return next();
  } catch (e) {
    console.error('Usage limiter error:', e);
    return res.status(500).json({ error: 'Usage limiter error' });
  }
}
