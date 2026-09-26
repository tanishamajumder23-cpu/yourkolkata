// ---------------------------------------------------------------------------
// Google Directions API — used to order the day's stops into an efficient
// route from a single starting point (hotel / station / airport).
//
// We ask Directions to optimize the waypoint order (a travelling-salesman-ish
// optimization Google does for us) and read back both the order and the
// travel-time of each leg.
//
// If GOOGLE_MAPS_API_KEY is missing, or any stop lacks coordinates, we fall
// back to a clearly-marked MOCK ordering (input order, estimated travel gaps).
// ---------------------------------------------------------------------------

import { hasMapsKey } from './places.js';

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const MOCK_LEG_MINUTES = 20; // estimated travel time between stops in mock mode

/**
 * @param {{lat:number,lng:number,name?:string}} start  starting point
 * @param {Array} stops  places with lat/lng
 * @param {'walking'|'driving'|'transit'} mode
 * @returns {{ mock:boolean, order:number[], legMinutes:number[] }}
 *   order      = indices into `stops` in the efficient visiting order
 *   legMinutes = travel minutes to REACH each stop in `order` (from previous point)
 */
export async function orderStops(start, stops, mode = 'driving') {
  const haveCoords = start?.lat != null && stops.every((s) => s.lat != null && s.lng != null);

  // ---- MOCK PATH ---------------------------------------------------------
  if (!hasMapsKey() || !haveCoords) {
    if (!hasMapsKey()) {
      console.warn('[directions] ⚠ MOCK MODE: no GOOGLE_MAPS_API_KEY — using input order + estimated gaps.');
    } else {
      console.warn('[directions] ⚠ Some stops lack coordinates — using input order + estimated gaps.');
    }
    return {
      mock: true,
      order: stops.map((_, i) => i),
      legMinutes: stops.map(() => MOCK_LEG_MINUTES),
    };
  }

  // ---- REAL PATH ---------------------------------------------------------
  const waypoints =
    'optimize:true|' + stops.map((s) => `${s.lat},${s.lng}`).join('|');
  const origin = `${start.lat},${start.lng}`;
  // Round trip back to the start so the optimizer has a fixed origin/destination.
  const url =
    `${DIRECTIONS_URL}?origin=${origin}&destination=${origin}` +
    `&waypoints=${encodeURIComponent(waypoints)}&mode=${mode}` +
    `&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.routes?.length) {
      console.warn(`[directions] Directions failed (status: ${data.status}). Falling back to input order.`);
      return { mock: true, order: stops.map((_, i) => i), legMinutes: stops.map(() => MOCK_LEG_MINUTES) };
    }

    const route = data.routes[0];
    const order = route.waypoint_order; // efficient order of the waypoints
    // legs[i] is travel from point i to point i+1. legs[0] = start -> first stop.
    // We want the travel time to reach each stop in `order`.
    const legMinutes = order.map((_, i) => {
      const leg = route.legs[i];
      return leg ? Math.round((leg.duration?.value || 0) / 60) : MOCK_LEG_MINUTES;
    });

    return { mock: false, order, legMinutes };
  } catch (err) {
    console.error('[directions] Request error:', err.message);
    return { mock: true, order: stops.map((_, i) => i), legMinutes: stops.map(() => MOCK_LEG_MINUTES) };
  }
}
