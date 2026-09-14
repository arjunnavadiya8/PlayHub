import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import VenueCard from '../components/VenueCard.jsx';
import BookingModal from '../components/BookingModal.jsx';

const sports = ['All', 'Cricket', 'Football', 'Pickleball', 'Badminton', 'Tennis'];
const today = () => {
  const value = new Date(); value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
};
const initialFilters = { area: 'Surat', sport: 'All', date: today() };

export default function Home() {
  const [venues, setVenues] = useState([]);
  const [areas, setAreas] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);

  const findVenues = async (overrides = {}, scroll = false) => {
    const next = { ...filters, ...overrides };
    setFilters(next); setAppliedFilters(next); setLoading(true); setError('');
    const params = new URLSearchParams();
    if (next.area.trim()) params.set('area', next.area.trim());
    if (next.sport !== 'All') params.set('sport', next.sport);
    if (next.date) params.set('date', next.date);
    try {
      const data = await api(`/venues?${params.toString()}`);
      setVenues(data.venues);
      if (scroll) document.getElementById('venues')?.scrollIntoView({ behavior: 'smooth' });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    findVenues(initialFilters);
    api('/venues/areas').then(data => setAreas(data.areas || [])).catch(() => setAreas([]));
  }, []);

  const submitSearch = event => { event.preventDefault(); findVenues({}, true); };
  const chooseSport = sport => findVenues({ sport }, true);
  const chooseArea = area => findVenues({ area }, true);
  const clearFilters = () => findVenues({ ...initialFilters, area: '' });
  const formattedDate = new Date(`${appliedFilters.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return <>
    <section className="hero customer-hero">
      <div className="hero-shade" />
      <div className="hero-content">
        <p className="eyebrow"><span /> SURAT'S SPORTS BOOKING HUB</p>
        <h1>ANY SPORT<br />ANY TURF<br /><em>SAME PASSION</em></h1>
        <p className="hero-copy">Book cricket, football, pickleball, tennis and badminton courts in just a few clicks.</p>
        <form className="search-card discovery-search" onSubmit={submitSearch}>
          <label><span className="field-icon">⌖</span><span><small>LOCATION</small><input aria-label="Location" value={filters.area} onChange={event => setFilters({ ...filters, area: event.target.value })} placeholder="Area or venue in Surat" /></span></label>
          <label><span className="field-icon">◉</span><span><small>SPORT</small><select aria-label="Sport" value={filters.sport} onChange={event => setFilters({ ...filters, sport: event.target.value })}>{sports.map(item => <option key={item}>{item}</option>)}</select></span></label>
          <label><span className="field-icon">▣</span><span><small>DATE</small><input aria-label="Date" type="date" min={today()} value={filters.date} onChange={event => setFilters({ ...filters, date: event.target.value })} /></span></label>
          <button className="primary search-submit" type="submit">Find turfs <span>→</span></button>
        </form>
        <div className="quick-sports"><span>POPULAR SEARCHES</span>{sports.slice(1).map(item => <button key={item} className={filters.sport === item ? 'active' : ''} onClick={() => chooseSport(item)}>{item}</button>)}</div>
      </div>
      <div className="hero-message"><strong>PLAY</strong><strong>SWEAT</strong><strong>CONNECT</strong></div>
    </section>

    <section className="section venues-section" id="venues">
      <div className="section-head discovery-heading"><div><p className="eyebrow dark"><span /> LIVE AVAILABILITY</p><h2>Turfs available for you</h2><p>{appliedFilters.sport === 'All' ? 'All sports' : appliedFilters.sport} · {formattedDate}{appliedFilters.area ? ` · ${appliedFilters.area}` : ''}</p></div><button className="link-btn" onClick={clearFilters}>Clear filters ↗</button></div>
      <div className="venue-filter-bar">
        <div className="filter-row">{sports.map(item => <button key={item} className={`filter ${appliedFilters.sport === item ? 'active' : ''}`} onClick={() => chooseSport(item)}>{item === 'All' ? 'All sports' : item}</button>)}</div>
        <label className="area-filter"><span>AREA</span><select aria-label="Filter by area" value={areas.includes(appliedFilters.area) ? appliedFilters.area : ''} onChange={event => chooseArea(event.target.value)}><option value="">All Surat areas</option>{areas.map(area => <option key={area} value={area}>{area}</option>)}</select></label>
      </div>
      {error && <p className="form-error">{error} — make sure the API and MongoDB are running.</p>}
      <div className="discovery-layout">
        <div>{loading ? <div className="loading-grid">Finding live slots…</div> : venues.length ? <div className="venue-grid discovery-grid">{venues.map(venue => <VenueCard key={venue._id} venue={venue} onBook={setBooking} />)}</div> : <div className="empty-search"><span>◷</span><h3>No available turfs found</h3><p>Try another time, date, sport, or nearby Surat area.</p><button className="dark-button" onClick={clearFilters}>Reset search</button></div>}</div>
        <aside className="customer-promo"><div><small>BOOK ON THE GO</small><h3>Play <em>Anytime.</em><br />Play Anywhere.</h3><p>Live availability, secure payments and instant booking confirmation.</p><button onClick={() => document.querySelector('.discovery-search input')?.focus()}>Book now →</button></div><div className="promo-phone"><span className="brand-mark">P</span><strong>PlayHub</strong><i>Find. Book. Play.</i></div></aside>
      </div>
      <div className="community-stats"><span><b>10K+</b>Happy players</span><span><b>250+</b>Turfs listed</span><span><b>15+</b>Sports</span><span><b>25+</b>Cities</span></div>
    </section>

    <section className="how-strip" id="how"><div className="how-strip-head"><div><p className="eyebrow dark"><span /> SIMPLE BOOKING</p><h2>How it works</h2></div><p>Find and book your game in minutes.</p></div><div className="how-flow"><article><i>⌖</i><div><b>1. Choose location</b><span>Search turfs near you</span></div></article><article><i>◉</i><div><b>2. Select sport</b><span>Pick your game</span></div></article><article><i>▣</i><div><b>3. Pick date & time</b><span>Check real-time availability</span></div></article><article><i>▤</i><div><b>4. Confirm & pay</b><span>Secure and hassle-free</span></div></article><article><i>✓</i><div><b>5. Get ready to play</b><span>See you on the turf</span></div></article></div></section>
    {booking && <BookingModal venue={booking} initialDate={appliedFilters.date} initialSport={appliedFilters.sport} onClose={() => setBooking(null)} />}
  </>;
}
