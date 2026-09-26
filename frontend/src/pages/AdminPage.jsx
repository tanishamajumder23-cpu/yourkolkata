import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminPage() {
  const [linkId, setLinkId] = useState('default');
  const [interests, setInterests] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // The host's manually-added "local secret" spot.
  const [secret, setSecret] = useState({ name: '', why: '', lat: '', lng: '' });

  // Day settings (the spec's open questions — sensible editable defaults).
  const [startName, setStartName] = useState('Hotel');
  const [startLat, setStartLat] = useState('22.5726');
  const [startLng, setStartLng] = useState('88.3639');
  const [startTime, setStartTime] = useState('09:30');
  const [mode, setMode] = useState('driving');

  const [itinerary, setItinerary] = useState(null);
  const [closingNote, setClosingNote] = useState(
    "That's the day. I picked each of these with you in mind — the last one especially. Hope it was a good one. 🤍"
  );
  const [savedUrl, setSavedUrl] = useState('');

  // Load a submission (interests + any suggestions produced on submit).
  async function loadSubmission() {
    setMsg('');
    try {
      const rec = await api.getInterests(linkId);
      setInterests(rec.interests || '');
      const sugg = rec.suggestions || [];
      setSuggestions(sugg);
      setSelected(new Set(sugg.map((_, i) => i))); // default: all selected
      setMeta(rec.suggestionsMeta || null);
    } catch (err) {
      setMsg(err.message);
      setInterests('');
      setSuggestions([]);
    }
  }

  useEffect(() => {
    loadSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run the AI suggestion step manually.
  async function rerunSuggestions() {
    if (!interests.trim()) return setMsg('No interests to run on yet.');
    setLoading(true);
    setMsg('');
    try {
      const { places, meta } = await api.suggest(interests.trim());
      setSuggestions(places);
      setSelected(new Set(places.map((_, i) => i)));
      setMeta(meta);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggle(i) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function buildItinerary() {
    const selected_places = suggestions.filter((_, i) => selected.has(i));
    const manual_places = secret.name.trim()
      ? [{
          name: secret.name.trim(),
          why: secret.why.trim(),
          lat: secret.lat ? Number(secret.lat) : null,
          lng: secret.lng ? Number(secret.lng) : null,
        }]
      : [];

    if (selected_places.length + manual_places.length === 0) {
      return setMsg('Pick at least one place (or add your secret spot).');
    }

    setLoading(true);
    setMsg('');
    try {
      const start = { name: startName, lat: Number(startLat), lng: Number(startLng) };
      const res = await api.build({ selected_places, manual_places, start, startTime, mode });
      setItinerary(res.itinerary);
      if (res.meta?.directionsMock) {
        setMsg('Built using estimated travel times (Directions is in mock mode — add GOOGLE_MAPS_API_KEY for real ordering).');
      }
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveAndGetLink() {
    if (!itinerary?.length) return setMsg('Build an itinerary first.');
    setLoading(true);
    setMsg('');
    try {
      const start = { name: startName, lat: Number(startLat), lng: Number(startLng) };
      const res = await api.save({ itinerary, closingNote, start, startTime });
      setSavedUrl(`${window.location.origin}${res.url}`);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  const intakeLink = `${window.location.origin}/tell-me/${linkId || 'default'}`;

  return (
    <div className="admin">
      <header className="admin-head">
        <h1>Trip control room</h1>
        <p className="admin-note">Private page. Curate the day, add your secret spot, build & share.</p>
      </header>

      {/* --- Step 0: which submission --- */}
      <section className="panel">
        <h2>1 · Their submission</h2>
        <div className="row">
          <label>Intake link id</label>
          <input value={linkId} onChange={(e) => setLinkId(e.target.value)} />
          <button onClick={loadSubmission}>Load</button>
        </div>
        <p className="hint">
          Share this intake link with them: <code>{intakeLink}</code>
        </p>
        {interests
          ? <p className="interests-box"><strong>They said:</strong> {interests}</p>
          : <p className="hint">No submission loaded yet for this link id.</p>}
      </section>

      {/* --- Step 1: suggestions --- */}
      <section className="panel">
        <div className="panel-head">
          <h2>2 · AI suggestions</h2>
          <button onClick={rerunSuggestions} disabled={loading}>Get / re-run suggestions</button>
        </div>
        {meta && (meta.groqMock || meta.placesMock) && (
          <p className="mock-flag">
            ⚠ Mock data in use — {meta.groqMock ? 'Groq (add GROQ_API_KEY)' : ''}
            {meta.groqMock && meta.placesMock ? ' · ' : ''}
            {meta.placesMock ? 'Places (add GOOGLE_MAPS_API_KEY)' : ''}
          </p>
        )}
        <div className="cards">
          {suggestions.map((s, i) => (
            <label key={i} className={`s-card ${selected.has(i) ? 'on' : 'off'}`}>
              <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
              {s.photo_url && <img src={s.photo_url} alt={s.name} />}
              <div className="s-body">
                <div className="s-name">{s.name}</div>
                <div className="s-cat">{s.category}{s.rating ? ` · ★ ${s.rating}` : ''}</div>
                <div className="s-reason">{s.reason}</div>
                {s.address && <div className="s-addr">{s.address}</div>}
              </div>
            </label>
          ))}
          {suggestions.length === 0 && <p className="hint">No suggestions yet.</p>}
        </div>
      </section>

      {/* --- Step 2: secret spot --- */}
      <section className="panel">
        <h2>3 · Your secret spot <span className="tag-secret">not from AI</span></h2>
        <div className="grid2">
          <input placeholder="Place name" value={secret.name} onChange={(e) => setSecret({ ...secret, name: e.target.value })} />
          <input placeholder="Latitude (optional)" value={secret.lat} onChange={(e) => setSecret({ ...secret, lat: e.target.value })} />
          <input placeholder="Why it's special" value={secret.why} onChange={(e) => setSecret({ ...secret, why: e.target.value })} />
          <input placeholder="Longitude (optional)" value={secret.lng} onChange={(e) => setSecret({ ...secret, lng: e.target.value })} />
        </div>
      </section>

      {/* --- Step 3: day settings + build --- */}
      <section className="panel">
        <h2>4 · The day</h2>
        <div className="grid2">
          <input placeholder="Start point name (hotel/station/airport)" value={startName} onChange={(e) => setStartName(e.target.value)} />
          <input placeholder="Start time (HH:MM)" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <input placeholder="Start latitude" value={startLat} onChange={(e) => setStartLat(e.target.value)} />
          <input placeholder="Start longitude" value={startLng} onChange={(e) => setStartLng(e.target.value)} />
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="driving">Getting around by car / cab</option>
            <option value="walking">On foot</option>
            <option value="transit">Public transit</option>
          </select>
        </div>
        <button className="primary" onClick={buildItinerary} disabled={loading}>Build itinerary</button>
      </section>

      {/* --- Step 4: preview + save --- */}
      {itinerary && (
        <section className="panel">
          <h2>5 · Ordered day</h2>
          <ol className="preview">
            {itinerary.map((stop, i) => (
              <li key={i}>
                <span className="p-time">{stop.time}</span>
                <span className="p-slot">{stop.time_slot}</span>
                <span className="p-name">{stop.name}{stop.is_secret ? ' 🤫' : ''}</span>
              </li>
            ))}
          </ol>

          <label className="closing-label">Closing note (they see this after the last stop)</label>
          <textarea value={closingNote} onChange={(e) => setClosingNote(e.target.value)} rows={3} />

          <button className="primary" onClick={saveAndGetLink} disabled={loading}>Save & get shareable link</button>

          {savedUrl && (
            <p className="saved">
              ✅ Share this with them:{' '}
              <a href={savedUrl} target="_blank" rel="noreferrer">{savedUrl}</a>
            </p>
          )}
        </section>
      )}

      {msg && <p className="admin-msg">{msg}</p>}
    </div>
  );
}
