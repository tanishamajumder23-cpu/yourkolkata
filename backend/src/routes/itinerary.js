import { Router } from 'express';
import { nanoid } from 'nanoid';
import { orderStops } from '../directions.js';
import { assignTimeSlots } from '../timeslots.js';
import { saveItinerary, getItinerary } from '../store.js';

const router = Router();

// Normalize a place (AI-suggested or manually-added) into the shape the trip
// page consumes. `is_secret` marks the host's manually-added local spot.
function normalize(place, isSecret) {
  return {
    name: (place.name || '').toString(),
    category: place.category || null,
    // The trip page calls it "blurb"; AI places carry it as "reason", manual
    // places may use "reason" or "why".
    blurb: (place.blurb || place.reason || place.why || '').toString(),
    address: place.address ?? null,
    rating: place.rating ?? null,
    photo_url: place.photo_url ?? null,
    lat: place.lat != null ? Number(place.lat) : null,
    lng: place.lng != null ? Number(place.lng) : null,
    place_id: place.place_id ?? null,
    is_secret: Boolean(isSecret),
  };
}

// POST /api/itinerary/build
// { selected_places: [...], manual_places: [...], start?: {name,lat,lng},
//   startTime?: "HH:MM", mode?: "walking"|"driving"|"transit" }
router.post('/build', async (req, res) => {
  const selected = Array.isArray(req.body?.selected_places) ? req.body.selected_places : [];
  const manual = Array.isArray(req.body?.manual_places) ? req.body.manual_places : [];
  const startTime = (req.body?.startTime || '09:30').toString();
  const mode = (req.body?.mode || 'driving').toString();

  // Starting point for the day (hotel / station / airport). Defaults to
  // central Kolkata if none is provided.
  const start = req.body?.start && req.body.start.lat != null
    ? req.body.start
    : { name: 'Central Kolkata (default start)', lat: 22.5726, lng: 88.3639 };

  const merged = [
    ...selected.map((p) => normalize(p, false)),
    ...manual.map((p) => normalize(p, true)),
  ];

  if (merged.length === 0) {
    return res.status(400).json({ error: 'Select at least one place to build an itinerary.' });
  }

  try {
    const { mock, order, legMinutes } = await orderStops(start, merged, mode);
    const ordered = order.map((idx) => merged[idx]);
    const orderedLegs = order.map((_, i) => legMinutes[i]);
    const withTimes = assignTimeSlots(ordered, orderedLegs, startTime);

    res.json({
      start,
      startTime,
      itinerary: withTimes,
      meta: { directionsMock: mock },
    });
  } catch (err) {
    console.error('[itinerary/build] failed:', err.message);
    res.status(502).json({ error: 'Could not build itinerary.', detail: err.message });
  }
});

// POST /api/itinerary/save
// { itinerary: [...], closingNote?: string, start?: {...}, startTime?: string, title?: string }
// Saves with a short unique id and returns the shareable path.
router.post('/save', (req, res) => {
  const itinerary = Array.isArray(req.body?.itinerary) ? req.body.itinerary : null;
  if (!itinerary || itinerary.length === 0) {
    return res.status(400).json({ error: 'Nothing to save — build an itinerary first.' });
  }

  const id = nanoid(8);
  const record = saveItinerary(id, {
    itinerary,
    closingNote: (req.body?.closingNote || '').toString(),
    start: req.body?.start ?? null,
    startTime: req.body?.startTime ?? null,
    title: (req.body?.title || 'A day, just for you').toString(),
  });

  res.json({ id, url: `/trip/${id}`, savedAt: record.savedAt });
});

// GET /api/itinerary/:id — the trip page reads this to render.
router.get('/:id', (req, res) => {
  const record = getItinerary(req.params.id);
  if (!record) return res.status(404).json({ error: 'This trip link was not found.' });
  res.json(record);
});

export default router;
