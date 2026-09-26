import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import interestsRouter from './src/routes/interests.js';
import suggestRouter from './src/routes/suggest.js';
import itineraryRouter from './src/routes/itinerary.js';
import { hasGroqKey } from './src/groq.js';
import { hasMapsKey } from './src/places.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/interests', interestsRouter);
app.use('/api/suggest', suggestRouter);
app.use('/api/itinerary', itineraryRouter);

// Health / config check — tells you at a glance what's live vs mocked.
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    integrations: {
      groq: hasGroqKey() ? 'live' : 'MOCK (set GROQ_API_KEY)',
      googleMaps: hasMapsKey() ? 'live' : 'MOCK (set GOOGLE_MAPS_API_KEY)',
    },
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  Kolkata trip planner API  →  http://localhost:${PORT}`);
  console.log(`  Groq:        ${hasGroqKey() ? 'live ✓' : 'MOCK ⚠  (set GROQ_API_KEY in .env)'}`);
  console.log(`  Google Maps: ${hasMapsKey() ? 'live ✓' : 'MOCK ⚠  (set GOOGLE_MAPS_API_KEY in .env)'}\n`);
});
