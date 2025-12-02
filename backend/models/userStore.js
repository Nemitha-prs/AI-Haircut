import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const usersPath = path.join(dataDir, 'users.json');

async function ensureStore() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.access(usersPath).catch(async () => {
      await fs.writeFile(usersPath, JSON.stringify([], null, 2), 'utf8');
    });
  } catch (e) {
    // ignore
  }
}

export async function getUsers() {
  await ensureStore();
  const raw = await fs.readFile(usersPath, 'utf8');
  return JSON.parse(raw);
}

export async function saveUsers(users) {
  await ensureStore();
  await fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

export async function findUserByEmail(email) {
  const users = await getUsers();
  return users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
}

export async function createUser({ email, hashedPassword, googleId, isGoogleUser }) {
  const users = await getUsers();
  const exists = users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) throw new Error('Email already registered');
  const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
  const newUser = {
    id,
    email,
    hashedPassword,
    freeDailyScans: 3,
    attemptsToday: 3,
    lastScanDate: new Date().toISOString().slice(0, 10), // Start with today
    failedLoginAttempts: 0,
    lockUntil: null,
    googleId: googleId || null,
    isGoogleUser: isGoogleUser || false,
    unlimited: String(email).toLowerCase() === 'nemithaprs@gmail.com'
  };
  users.push(newUser);
  await saveUsers(users);
  return newUser;
}

export async function updateUser(user) {
  const users = await getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx === -1) throw new Error('User not found');
  users[idx] = user;
  await saveUsers(users);
  return user;
}

// Brute-force protection helpers
export async function incrementFailedAttempts(user) {
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= 5) {
    user.lockUntil = Date.now() + (5 * 60 * 1000); // Lock for 5 minutes
  }
  await updateUser(user);
  return user;
}

export async function resetFailedAttempts(user) {
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await updateUser(user);
  return user;
}

export function isAccountLocked(user) {
  if (!user.lockUntil) return false;
  if (Date.now() < user.lockUntil) return true;
  // Lock expired, reset it
  return false;
}
