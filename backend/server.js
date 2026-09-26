import app from './src/app.js';
import { hasGroqKey } from './src/groq.js';
import { hasMapsKey } from './src/places.js';
import { storageMode } from './src/store.js';

// Local / traditional-server entry point. On Vercel this file is not used —
// api/[...path].js serves the same app as a serverless function instead.
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  Kolkata trip planner API  →  http://localhost:${PORT}`);
  console.log(`  Storage:     ${storageMode()}`);
  console.log(`  Groq:        ${hasGroqKey() ? 'live ✓' : 'MOCK ⚠  (set GROQ_API_KEY in .env)'}`);
  console.log(`  Google Maps: ${hasMapsKey() ? 'live ✓' : 'MOCK ⚠  (set GOOGLE_MAPS_API_KEY in .env)'}\n`);
});
