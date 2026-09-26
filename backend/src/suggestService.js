// ---------------------------------------------------------------------------
// Shared suggestion pipeline: Groq (ideas) -> Google Places (enrichment).
// Used by both POST /api/suggest and, internally, POST /api/interests/submit.
// ---------------------------------------------------------------------------

import { suggestPlaces, hasGroqKey } from './groq.js';
import { enrichPlaces, hasMapsKey } from './places.js';

export async function runSuggestions(interests) {
  const { mock: groqMock, places: ideas } = await suggestPlaces(interests);
  const enriched = await enrichPlaces(ideas);

  return {
    places: enriched,
    // Surface exactly which real integrations are live vs mocked, so the
    // admin UI (and you) can tell what still needs a key.
    meta: {
      groqMock,
      placesMock: !hasMapsKey(),
      usingGroq: hasGroqKey(),
      usingPlaces: hasMapsKey(),
    },
  };
}
