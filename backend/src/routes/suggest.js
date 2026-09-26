import { Router } from 'express';
import { runSuggestions } from '../suggestService.js';

const router = Router();

// POST /api/suggest  { interests: string }
// Returns enriched place suggestions. Kept as its own endpoint so the admin
// page can re-run suggestions manually.
router.post('/', async (req, res) => {
  const interests = (req.body?.interests || '').toString().trim();
  if (!interests) {
    return res.status(400).json({ error: 'Please include a non-empty "interests" string.' });
  }
  try {
    const result = await runSuggestions(interests);
    res.json(result);
  } catch (err) {
    console.error('[suggest] failed:', err.message);
    res.status(502).json({ error: 'Suggestion step failed.', detail: err.message });
  }
});

export default router;
