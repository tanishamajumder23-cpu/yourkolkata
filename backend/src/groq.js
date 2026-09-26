// ---------------------------------------------------------------------------
// Groq is the ONLY AI provider in this project. No Gemini, no fallback to any
// other model — by design. If GROQ_API_KEY is missing, we return clearly
// marked MOCK suggestions instead of silently swapping providers.
// ---------------------------------------------------------------------------

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

// ===========================================================================
// MOCK DATA PATH — used only when GROQ_API_KEY is not set.
// Replace nothing here; just add the key to .env and this path is skipped.
// ===========================================================================
function mockSuggestions(interests) {
  console.warn('[groq] ⚠ MOCK MODE: no GROQ_API_KEY set — returning canned suggestions.');
  return [
    { name: 'Victoria Memorial', category: 'History & architecture', reason: `A grand marble landmark — a natural fit for "${interests}".` },
    { name: 'Indian Museum', category: 'History & museums', reason: 'The oldest museum in India, dense with artefacts and quiet galleries.' },
    { name: 'Kumartuli', category: 'Art & photography', reason: 'The idol-makers\' quarter — endless character for a photographer.' },
    { name: 'College Street', category: 'Books & culture', reason: 'A sprawling second-hand book market with a legendary coffee house.' },
    { name: 'Prinsep Ghat', category: 'Quiet spots & riverside', reason: 'A calm riverside promenade, best in soft evening light.' },
    { name: 'Kalighat Temple', category: 'Culture & spirituality', reason: 'One of the city\'s most significant and atmospheric temples.' },
    { name: 'Park Street', category: 'Street food & nightlife', reason: 'The city\'s classic food-and-lights strip after dark.' },
    { name: 'Dakshinapan / Dacres Lane', category: 'Street food', reason: 'Beloved local food lanes — exactly the kind of spot to eat like a local.' },
  ];
}

/**
 * Ask Groq for a shortlist of real Kolkata places matching free-text interests.
 * Returns: [{ name, category, reason }]
 * The Places enrichment (address/rating/photo/coords) happens later in places.js.
 */
export async function suggestPlaces(interests) {
  if (!hasGroqKey()) {
    return { mock: true, places: mockSuggestions(interests) };
  }

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const prompt =
    `Suggest 8-10 real, currently-existing places in Kolkata, India that match ` +
    `these interests: "${interests}".\n` +
    `For each place return: its exact commonly-used name (so it can be found on ` +
    `Google Maps), a short category, and a 1-2 sentence reason why it fits the ` +
    `interests.\n` +
    `Respond with ONLY a JSON object of the form ` +
    `{"places":[{"name":"","category":"","reason":""}]} and nothing else.`;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a knowledgeable Kolkata local guide. You only return valid JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '{}';

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`Groq returned non-JSON content: ${content.slice(0, 200)}`);
  }

  const places = Array.isArray(parsed.places) ? parsed.places : [];
  return {
    mock: false,
    places: places
      .filter((p) => p && p.name)
      .map((p) => ({
        name: String(p.name).trim(),
        category: String(p.category || 'Place of interest').trim(),
        reason: String(p.reason || '').trim(),
      })),
  };
}
