// ---------------------------------------------------------------------------
// Time-slot assignment. Given an ordered list of stops and the travel time to
// reach each, lay them out across a single day with realistic gaps and label
// each with both a concrete clock time ("10:00 AM") and a slot bucket
// (Morning / Lunch / Afternoon / Evening).
//
// Rule of thumb (per the spec): ~2 hours at each stop, plus travel time.
// A stop that lands around midday and reads as food-related is tagged "Lunch".
// ---------------------------------------------------------------------------

const DWELL_MINUTES = 120; // ~2 hours per stop

function formatClock(totalMinutesFromMidnight) {
  let h = Math.floor(totalMinutesFromMidnight / 60) % 24;
  const m = totalMinutesFromMidnight % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm} ${ampm}`;
}

function looksLikeFood(stop) {
  const hay = `${stop.name} ${stop.category || ''} ${stop.blurb || stop.reason || ''}`.toLowerCase();
  return /food|eat|lunch|restaurant|cafe|café|coffee|dhaba|street food|kathi|biryani|sweet|market/.test(hay);
}

function slotForTime(minutes, stop) {
  const hour = Math.floor(minutes / 60);
  // Midday food stop → Lunch, regardless of exact hour bucket.
  if (hour >= 11 && hour < 15 && looksLikeFood(stop)) return 'Lunch';
  if (hour < 12) return 'Morning';
  if (hour < 14) return 'Lunch';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

/**
 * @param {Array} orderedStops  stops already in visiting order
 * @param {number[]} legMinutes travel minutes to reach each stop
 * @param {string} startTime    "HH:MM" 24h, day start (default 09:30)
 * @returns stops with { time, time_slot } added
 */
export function assignTimeSlots(orderedStops, legMinutes, startTime = '09:30') {
  const [sh, sm] = startTime.split(':').map((n) => parseInt(n, 10));
  let cursor = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 30 : sm);

  return orderedStops.map((stop, i) => {
    // Add travel time to reach this stop (first stop: travel from the start point).
    cursor += legMinutes[i] ?? 0;
    const arrival = cursor;
    const result = {
      ...stop,
      time: formatClock(arrival),
      time_slot: slotForTime(arrival, stop),
    };
    // Then spend ~2 hours here before moving on.
    cursor += DWELL_MINUTES;
    return result;
  });
}
