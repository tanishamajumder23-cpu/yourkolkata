import { Router } from 'express';
import { runSuggestions } from '../suggestService.js';
import { saveInterests, getInterests, listInterests } from '../store.js';

const router = Router();

// POST /api/interests/submit  { interests: string, linkId?: string }
// PUBLIC — the traveller's intake form hits this directly.
// Stores the raw interests, then internally triggers the AI suggestion step
// so the host doesn't have to kick it off manually. The response is only a
// friendly confirmation — the traveller never sees the suggestions.
router.post('/submit', async (req, res) => {
  const interests = (req.body?.interests || '').toString().trim();
  // linkId ties a submission to the intake link (/tell-me/:linkId). Optional;
  // defaults to "default" so the app works even with a bare link.
  const linkId = (req.body?.linkId || 'default').toString().trim();

  if (!interests) {
    return res.status(400).json({ error: 'Please tell us a little about what you\'re into.' });
  }

  // Save the raw interests immediately so nothing is lost even if the AI
  // step is slow or a key is missing.
  await saveInterests(linkId, { interests, suggestions: null, suggestionsMeta: null });

  // Fire the suggestion pipeline internally. We still confirm success to the
  // traveller even if suggestions error out — that's the host's problem to see.
  try {
    const { places, meta } = await runSuggestions(interests);
    await saveInterests(linkId, { interests, suggestions: places, suggestionsMeta: meta });
  } catch (err) {
    console.error('[interests] internal suggestion step failed:', err.message);
    await saveInterests(linkId, { interests, suggestions: null, suggestionsMeta: { error: err.message } });
  }

  res.json({ ok: true, message: 'Got it — thank you! 🌼' });
});

// GET /api/interests/:linkId — admin-side read of a submission + its suggestions.
router.get('/:linkId', async (req, res) => {
  const record = await getInterests(req.params.linkId);
  if (!record) return res.status(404).json({ error: 'No submission for this link yet.' });
  res.json(record);
});

// GET /api/interests — admin-side list of all submissions.
router.get('/', async (_req, res) => {
  res.json({ submissions: await listInterests() });
});

export default router;
