// ---------------------------------------------------------------------------
// Storage with two interchangeable backends behind one async API:
//
//   1. Upstash Redis (used automatically in production, e.g. on Vercel) —
//      an always-on hosted key/value store, so saved trips never disappear.
//      Enabled when the environment provides a Redis REST URL + token. Vercel's
//      Upstash integration injects these for you (KV_REST_API_URL / _TOKEN, or
//      UPSTASH_REDIS_REST_URL / _TOKEN).
//
//   2. Local JSON file (data/db.json) — used when no Redis env is present, so
//      `npm start` on your machine works with zero setup.
//
// Same functions, same shapes, either way. All functions are async.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);

export function storageMode() {
  return USE_REDIS ? 'redis (Upstash) ✓ durable' : 'local JSON file (dev only — not durable in the cloud)';
}

// ===========================================================================
// Backend 1 — Upstash Redis (via its REST API; no persistent socket needed,
// which is exactly what serverless functions want).
// ===========================================================================
async function redisCmd(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}: ${await res.text().catch(() => '')}`);
  const data = await res.json();
  return data.result;
}

const redisStore = {
  async setJson(key, value) { await redisCmd(['SET', key, JSON.stringify(value)]); },
  async getJson(key) {
    const raw = await redisCmd(['GET', key]);
    return raw ? JSON.parse(raw) : null;
  },
  async addToIndex(setKey, member) { await redisCmd(['SADD', setKey, member]); },
  async members(setKey) { return (await redisCmd(['SMEMBERS', setKey])) || []; },
};

// ===========================================================================
// Backend 2 — local JSON file.
// ===========================================================================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const EMPTY_DB = { interests: {}, itineraries: {} };

function readFileDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) return { ...EMPTY_DB };
    return { ...EMPTY_DB, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) };
  } catch (err) {
    console.error('[store] file read failed, starting fresh:', err.message);
    return { ...EMPTY_DB };
  }
}

function writeFileDb(db) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// ===========================================================================
// Public API — identical regardless of backend.
// ===========================================================================

export async function saveInterests(linkId, submission) {
  const record = { ...submission, linkId, submittedAt: new Date().toISOString() };
  if (USE_REDIS) {
    await redisStore.setJson(`interest:${linkId}`, record);
    await redisStore.addToIndex('interests:ids', linkId);
  } else {
    const db = readFileDb();
    db.interests[linkId] = record;
    writeFileDb(db);
  }
  return record;
}

export async function getInterests(linkId) {
  if (USE_REDIS) return redisStore.getJson(`interest:${linkId}`);
  return readFileDb().interests[linkId] || null;
}

export async function listInterests() {
  if (USE_REDIS) {
    const ids = await redisStore.members('interests:ids');
    const records = await Promise.all(ids.map((id) => redisStore.getJson(`interest:${id}`)));
    return records.filter(Boolean);
  }
  return Object.values(readFileDb().interests);
}

export async function saveItinerary(id, itinerary) {
  const record = { ...itinerary, id, savedAt: new Date().toISOString() };
  if (USE_REDIS) {
    await redisStore.setJson(`itinerary:${id}`, record);
  } else {
    const db = readFileDb();
    db.itineraries[id] = record;
    writeFileDb(db);
  }
  return record;
}

export async function getItinerary(id) {
  if (USE_REDIS) return redisStore.getJson(`itinerary:${id}`);
  return readFileDb().itineraries[id] || null;
}
