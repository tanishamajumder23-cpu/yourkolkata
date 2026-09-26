import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

// A few gentle starter chips. Tapping one drops it into the text box — but the
// box is the main event; this stays low-friction and doesn't hint at a surprise.
const CHIPS = ['history', 'street food', 'quiet photography spots', 'old bookshops', 'riverside', 'art', 'music', 'temples'];

export default function IntakePage() {
  const { linkId } = useParams();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  function addChip(chip) {
    setText((t) => (t.trim() ? `${t.trim()}, ${chip}` : chip));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setStatus('sending');
    setError('');
    try {
      await api.submitInterests(text.trim(), linkId);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="intake-wrap">
        <div className="intake-card">
          <div className="intake-tick">🌼</div>
          <h1 className="intake-thanks">Got it — thank you!</h1>
          <p className="intake-sub">That’s all I needed. Talk soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="intake-wrap">
      <form className="intake-card" onSubmit={handleSubmit}>
        <h1 className="intake-title">Quick one —</h1>
        <p className="intake-sub">what are you into these days? A few words is plenty.</p>

        <textarea
          className="intake-input"
          placeholder="e.g. history, street food, quiet corners to take photos…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
        />

        <div className="intake-chips">
          {CHIPS.map((c) => (
            <button type="button" key={c} className="chip" onClick={() => addChip(c)}>
              + {c}
            </button>
          ))}
        </div>

        {status === 'error' && <p className="intake-error">{error}</p>}

        <button type="submit" className="intake-submit" disabled={status === 'sending' || !text.trim()}>
          {status === 'sending' ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
