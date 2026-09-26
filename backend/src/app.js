import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import interestsRouter from './routes/interests.js';
import suggestRouter from './routes/suggest.js';
import itineraryRouter from './routes/itinerary.js';
import { hasGroqKey } from './groq.js';
import { hasMapsKey } from './places.js';
import { storageMode } from './store.js';

// Builds and returns the configured Express app. Kept separate from server.js
// so the same app can be used two ways:
//   - locally / on a normal server: server.js calls app.listen()
//   - on Vercel: api/[...path].js exports this app as a serverless function
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
    storage: storageMode(),
    integrations: {
      groq: hasGroqKey() ? 'live' : 'MOCK (set GROQ_API_KEY)',
      googleMaps: hasMapsKey() ? 'live' : 'MOCK (set GOOGLE_MAPS_API_KEY)',
    },
  });
});

export default app;
