// Tiny fetch helper. All calls go through the Vite dev proxy to the backend.

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function get(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  submitInterests: (interests, linkId) => post('/api/interests/submit', { interests, linkId }),
  getInterests: (linkId) => get(`/api/interests/${linkId}`),
  suggest: (interests) => post('/api/suggest', { interests }),
  build: (payload) => post('/api/itinerary/build', payload),
  save: (payload) => post('/api/itinerary/save', payload),
  getItinerary: (id) => get(`/api/itinerary/${id}`),
  health: () => get('/api/health'),
};
