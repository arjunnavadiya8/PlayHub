import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../state/AuthContext.jsx';

export default function BookingModal({ venue, initialDate, initialTime = '', initialSport = 'All', onClose }) {
  const { user, openAuth } = useAuth();
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]); const [selected, setSelected] = useState(null); const [state, setState] = useState('select'); const [error, setError] = useState(''); const [booking, setBooking] = useState(null);
  const availableTimes = [...slots.reduce((groups, slot) => {
    const key = `${slot.sport}|${new Date(slot.startTime).toISOString()}`;
    const existing = groups.get(key);
    if (existing) { existing.availableCourts += 1; existing.price = Math.min(existing.price, slot.price); }
    else groups.set(key, { key, sport: slot.sport, startTime: slot.startTime, price: slot.price, availableCourts: 1 });
    return groups;
  }, new Map()).values()];
  useEffect(() => {
    setError(''); setSelected(null);
    const params = new URLSearchParams({ date });
    if (initialSport !== 'All') params.set('sport', initialSport);
    api(`/venues/${venue._id}/slots?${params}`).then(data => {
      setSlots(data.slots);
      if (initialTime) {
        const matching = data.slots.find(slot => new Date(slot.startTime).toTimeString().slice(0, 5) === initialTime);
        if (matching) setSelected({ key: `${matching.sport}|${new Date(matching.startTime).toISOString()}`, sport: matching.sport, startTime: matching.startTime, price: matching.price, availableCourts: data.slots.filter(slot => slot.sport === matching.sport && new Date(slot.startTime).getTime() === new Date(matching.startTime).getTime()).length });
      }
    }).catch(err => setError(err.message));
  }, [venue, date, initialSport, initialTime]);
  const book = async () => {
    if (!user) { onClose(); return openAuth('login'); }
    if (user.role !== 'customer') return setError('Owner accounts cannot make customer bookings.');
    setState('paying');
    try {
      const held = await api('/bookings/hold', { method: 'POST', body: JSON.stringify({ venueId: venue._id, sport: selected.sport, startTime: selected.startTime }) });
      const confirmed = await api(`/bookings/${held.booking._id}/confirm`, { method: 'POST', body: JSON.stringify({ paymentReference: 'SIMULATED' }) });
      setBooking(confirmed.booking); setState('success');
    } catch (err) { setError(err.message); setState('select'); }
  };
  return <div className="modal open"><div className="modal-backdrop" onClick={onClose} /><div className="modal-panel"><button className="modal-close" onClick={onClose}>×</button>{state === 'success' ? <div className="success-view"><span className="success-check">✓</span><h2>You're booked!</h2><p>{venue.name} · {booking?.court?.name}</p><strong>Booking ID: {booking?.bookingCode}</strong><button className="dark-button wide top-gap" onClick={onClose}>Done</button></div> : <><h2>Choose your sport & time</h2><p className="sub">{venue.name} · {venue.area} · We assign an available court automatically.</p><label className="field-label">PLAY DATE<input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={event => { setDate(event.target.value); setSelected(null); }} /></label><h4>Available times</h4><div className="time-grid grouped-times">{availableTimes.map(option => <button key={option.key} className={`time-pill ${selected?.key === option.key ? 'selected' : ''}`} onClick={() => setSelected(option)}><strong>{new Date(option.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><small>{option.sport} · {option.availableCourts} {option.availableCourts === 1 ? 'court' : 'courts'} left</small></button>)}</div>{!availableTimes.length && !error && <p className="sub">No open times for this day.</p>}{error && <p className="form-error">{error}</p>}<div className="booking-summary"><span>{selected ? `${selected.sport} · ${selected.availableCourts} ${selected.availableCourts === 1 ? 'court' : 'courts'} available` : 'Select a time'}</span><strong>₹{selected?.price || venue.pricePerHour}</strong></div><p className="hold-note">PlayHub assigns one available court and holds it for five minutes during payment.</p><button className="primary wide" disabled={!selected || state === 'paying'} onClick={book}>{state === 'paying' ? 'Assigning court…' : user ? 'Confirm & book →' : 'Log in to book →'}</button></>}</div></div>;
}
