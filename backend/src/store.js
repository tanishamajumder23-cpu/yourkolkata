// ---------------------------------------------------------------------------
// Lightweight JSON-file storage. No real database needed.
//
// Everything lives in a single file: data/db.json, shaped like:
//   {
//     "interests":   { "<linkId>": { ...submission } },
//     "itineraries": { "<id>":     { ...savedItinerary } }
//   }
//
// Reads/writes are synchronous and cheap — this app has a handful of records,
// not thousands. Writes are atomic (write to a temp file, then rename).
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY_DB = { interests: {}, itineraries: {} };

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
  }
}

function readDb() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...EMPTY_DB, ...parsed };
  } catch (err) {
    console.error('[store] Could not read db.json, starting fresh:', err.message);
    return { ...EMPTY_DB };
  }
}

function writeDb(db) {
  ensureFile();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// --- Interests (the traveller's intake submission) ------------------------

export function saveInterests(linkId, submission) {
  const db = readDb();
  db.interests[linkId] = {
    ...submission,
    linkId,
    submittedAt: new Date().toISOString(),
  };
  writeDb(db);
  return db.interests[linkId];
}

export function getInterests(linkId) {
  return readDb().interests[linkId] || null;
}

export function listInterests() {
  return Object.values(readDb().interests);
}

// --- Itineraries (the final, curated trip) --------------------------------

export function saveItinerary(id, itinerary) {
  const db = readDb();
  db.itineraries[id] = {
    ...itinerary,
    id,
    savedAt: new Date().toISOString(),
  };
  writeDb(db);
  return db.itineraries[id];
}

export function getItinerary(id) {
  return readDb().itineraries[id] || null;
}
