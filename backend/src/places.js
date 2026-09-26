// ---------------------------------------------------------------------------
// Google Places enrichment. Takes a place NAME (from Groq) and looks up the
// real address, rating, coordinates, place_id and a photo URL.
//
// Uses the Places API "Text Search" + "Place Photo" endpoints. Requires
// GOOGLE_MAPS_API_KEY with the Places API enabled.
//
// If the key is missing, returns a clearly-marked MOCK enrichment so the rest
// of the app keeps working end-to-end without a key.
// ---------------------------------------------------------------------------

const TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

export function hasMapsKey() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

// Build a Place Photo URL from a photo_reference. This URL itself embeds the
// key, so it is only ever used server-side to produce a value we hand back.
function photoUrlFromRef(photoRef, maxwidth = 800) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return `${PHOTO_URL}?maxwidth=${maxwidth}&photo_reference=${photoRef}&key=${key}`;
}

// ===========================================================================
// MOCK DATA PATH — used only when GOOGLE_MAPS_API_KEY is not set.
// Photos come from a royalty-free placeholder service keyed by the name so the
// UI has *something* postcard-worthy to show while you test without a key.
// ===========================================================================
function mockEnrichment(place) {
  const seed = encodeURIComponent(place.name);
  return {
    ...place,
    address: 'Kolkata, West Bengal, India (mock — add GOOGLE_MAPS_API_KEY for the real address)',
    rating: null,
    photo_url: `https://picsum.photos/seed/${seed}/800/600`,
    lat: 22.5726,
    lng: 88.3639,
    place_id: null,
    mock: true,
  };
}

/**
 * Enrich a single {name, category, reason} with Google Places data.
 */
async function enrichOne(place) {
  if (!hasMapsKey()) return mockEnrichment(place);

  try {
    const url = `${TEXT_SEARCH_URL}?query=${encodeURIComponent(place.name + ', Kolkata')}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn(`[places] No match for "${place.name}" (status: ${data.status}). Keeping name only.`);
      return { ...place, address: null, rating: null, photo_url: null, lat: null, lng: null, place_id: null, mock: false };
    }

    const top = data.results[0];
    const photoRef = top.photos?.[0]?.photo_reference || null;

    return {
      ...place,
      address: top.formatted_address || null,
      rating: typeof top.rating === 'number' ? top.rating : null,
      photo_url: photoRef ? photoUrlFromRef(photoRef) : null,
      lat: top.geometry?.location?.lat ?? null,
      lng: top.geometry?.location?.lng ?? null,
      place_id: top.place_id || null,
      mock: false,
    };
  } catch (err) {
    console.error(`[places] Lookup failed for "${place.name}":`, err.message);
    return { ...place, address: null, rating: null, photo_url: null, lat: null, lng: null, place_id: null, mock: false };
  }
}

/**
 * Enrich a list of Groq suggestions. Returns enriched place objects shaped:
 * { name, category, reason, address, rating, photo_url, lat, lng, place_id }
 */
export async function enrichPlaces(places) {
  return Promise.all(places.map(enrichOne));
}
