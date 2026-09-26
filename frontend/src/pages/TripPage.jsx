import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

// Parse a clock label like "10:00 AM" into minutes-from-midnight.
function labelToMinutes(label) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(label || '');
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  const min = parseInt(m[2], 10);
  if (/PM/i.test(m[3])) h += 12;
  return h * 60 + min;
}

// Small no-key map pin: the classic maps embed URL works without an API key.
function MapPin({ lat, lng, name }) {
  if (lat == null || lng == null) return null;
  const q = `${lat},${lng}`;
  return (
    <div className="map-pin">
      <iframe
        title={`Map of ${name}`}
        loading="lazy"
        src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`}
      />
      <a className="map-open" href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">
        Open in Maps ↗
      </a>
    </div>
  );
}

function Stop({ stop, unlocked, index }) {
  if (!unlocked) {
    return (
      <section className="stop locked">
        <div className="locked-inner">
          <div className="lock-icon">🔒</div>
          <div className="lock-time">Coming up at {stop.time}</div>
          <div className="lock-sub">{stop.time_slot}</div>
        </div>
      </section>
    );
  }

  return (
    <section className={`stop unlocked reveal ${stop.is_secret ? 'secret' : ''}`}>
      <div className="stop-time">
        <span className="dot" />
        {stop.time} · <span className="slot">{stop.time_slot}</span>
      </div>

      <article className="postcard">
        {stop.is_secret && (
          <div className="secret-note">
            <span className="secret-icon">✎</span>
            not on Google — just for you
          </div>
        )}

        <div className="photo-frame">
          {stop.photo_url ? (
            <img src={stop.photo_url} alt={stop.name} />
          ) : (
            <div className="photo-fallback">{stop.is_secret ? '🤍' : '📍'}</div>
          )}
          <div className="stamp">{String(index + 1).padStart(2, '0')}</div>
        </div>

        <div className="postcard-body">
          <h2 className="stop-name">{stop.name}</h2>
          {stop.category && !stop.is_secret && (
            <div className="stop-cat">{stop.category}{stop.rating ? ` · ★ ${stop.rating}` : ''}</div>
          )}
          <p className="stop-blurb">{stop.blurb}</p>
          {stop.address && <p className="stop-addr">{stop.address}</p>}
          <MapPin lat={stop.lat} lng={stop.lng} name={stop.name} />
        </div>
      </article>
    </section>
  );
}

export default function TripPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    api.getItinerary(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  // Tick the clock so stops unlock live as their time arrives. Pure time
  // comparison — no location, no tracking.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="trip-msg">🌧️ {error}</div>;
  if (!data) return <div className="trip-msg">Loading your day…</div>;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const stops = data.itinerary || [];
  const unlockedFlags = stops.map((s) => {
    const mins = labelToMinutes(s.time);
    return mins == null ? true : nowMinutes >= mins;
  });
  const allUnlocked = unlockedFlags.every(Boolean);

  return (
    <div className="trip">
      <header className="trip-hero">
        <p className="trip-kicker">a day out, planned just for you</p>
        <h1 className="trip-title">{data.title || 'A day, just for you'}</h1>
        <p className="trip-when">
          {data.start?.name ? `Starting from ${data.start.name}` : 'Follow it stop by stop'} ·
          each stop opens as its time arrives
        </p>
      </header>

      <div className="timeline">
        {stops.map((stop, i) => (
          <Stop key={i} stop={stop} unlocked={unlockedFlags[i]} index={i} />
        ))}
      </div>

      {allUnlocked && data.closingNote && (
        <footer className="closing reveal">
          <div className="closing-card">
            <div className="closing-flourish">✿</div>
            <p className="closing-text">{data.closingNote}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
