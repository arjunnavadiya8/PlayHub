import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../state/AuthContext.jsx';

const sports = ['Cricket', 'Football', 'Pickleball', 'Badminton', 'Tennis'];
const emptyVenue = { name: '', area: '', address: '', sports: ['Cricket'], pricePerHour: 700, openingTime: '06:00', closingTime: '23:00', image: '', active: true };
const emptyCourt = { name: '', sportType: 'CRICKET', customSportName: '', defaultPrice: 700, slotDurationMinutes: 60 };
const formatMoney = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = value => new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function OwnerDashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('overview');
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [analytics, setAnalytics] = useState({ summary: {}, perVenue: [] });
  const [dashboardData, setDashboardData] = useState({ summary: {}, slots: [], recentBookings: [], courts: [] });
  const [customers, setCustomers] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [venueSlots, setVenueSlots] = useState([]);
  const [venueForm, setVenueForm] = useState(emptyVenue);
  const [editingId, setEditingId] = useState(null);
  const [slotForm, setSlotForm] = useState({ courtId: '', startTime: '', price: 700 });
  const [courtForm, setCourtForm] = useState(emptyCourt);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const selectedVenue = useMemo(() => venues.find(venue => venue._id === selectedVenueId), [venues, selectedVenueId]);
  const selectedCourt = useMemo(() => courts.find(court => court._id === slotForm.courtId), [courts, slotForm.courtId]);

  const loadDashboard = async () => {
    try {
      const [venueData, bookingData, analyticsData] = await Promise.all([api('/venues/mine'), api('/bookings/owner'), api('/bookings/owner/analytics')]);
      setVenues(venueData.venues); setBookings(bookingData.bookings); setAnalytics(analyticsData);
      setSelectedVenueId(current => current || venueData.venues[0]?._id || '');
    } catch (error) { setNotice(error.message); }
  };

  useEffect(() => { if (user?.role === 'owner') loadDashboard(); }, [user]);
  useEffect(() => {
    if (!selectedVenueId || user?.role !== 'owner') return;
    const from = new Date(); from.setHours(0, 0, 0, 0); const to = new Date(from.getTime() + 86400000);
    Promise.all([
      api(`/owner/venues/${selectedVenueId}/slots?from=${from.toISOString()}&to=${to.toISOString()}`),
      api(`/owner/venues/${selectedVenueId}/courts`),
      api(`/owner/venues/${selectedVenueId}/dashboard`),
      api(`/owner/venues/${selectedVenueId}/customers`)
    ]).then(([slotData, courtData, dashboard, customerData]) => {
      setVenueSlots(slotData.slots); setCourts(courtData.courts); setDashboardData(dashboard); setCustomers(customerData.customers || []);
      setSlotForm(form => ({ ...form, courtId: courtData.courts.some(court => court._id === form.courtId) ? form.courtId : courtData.courts[0]?._id || '' }));
    }).catch(error => setNotice(error.message));
  }, [selectedVenueId, user]);
  useEffect(() => { if (selectedCourt) setSlotForm(form => ({ ...form, price: selectedCourt.defaultPrice })); }, [selectedCourt]);

  if (loading) return <div className="owner-loading">Loading owner workspace…</div>;
  if (!user || user.role !== 'owner') return <Navigate to="/" />;

  const saveVenue = async event => {
    event.preventDefault(); setBusy(true); setNotice('');
    if (venueForm.openingTime >= venueForm.closingTime) {
      setNotice('Closing time must be later than opening time.'); setBusy(false); return;
    }
    try {
      if (editingId) await api(`/venues/${editingId}`, { method: 'PATCH', body: JSON.stringify(venueForm) });
      else await api('/venues', { method: 'POST', body: JSON.stringify(venueForm) });
      setNotice(editingId ? 'Venue changes saved.' : 'Venue listed successfully.'); setVenueForm(emptyVenue); setEditingId(null); await loadDashboard();
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const beginEdit = venue => { setEditingId(venue._id); setVenueForm({ ...venue, sports: [...venue.sports], openingTime: venue.openingTime || '06:00', closingTime: venue.closingTime || '23:00' }); setView('venues'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleSport = sport => setVenueForm(form => ({ ...form, sports: form.sports.includes(sport) ? form.sports.filter(item => item !== sport) : [...form.sports, sport] }));
  const createCourt = async event => {
    event.preventDefault(); setBusy(true); setNotice('');
    try { await api(`/owner/venues/${selectedVenueId}/courts`, { method: 'POST', body: JSON.stringify(courtForm) }); setCourtForm(emptyCourt); setNotice('Court created and 30 days of slots generated.'); const data = await api(`/owner/venues/${selectedVenueId}/courts`); setCourts(data.courts); await loadDashboard(); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const updateCourt = async (court, changes) => {
    try { const data = await api(`/owner/courts/${court._id}`, { method: 'PATCH', body: JSON.stringify(changes) }); setCourts(items => items.map(item => item._id === court._id ? data.court : item)); setNotice('Court updated.'); }
    catch (error) { setNotice(error.message); }
  };
  const createSlot = async event => {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const start = new Date(slotForm.startTime);
      await api(`/venues/${selectedVenueId}/slots`, { method: 'POST', body: JSON.stringify({ ...slotForm, price: Number(slotForm.price), startTime: start, endTime: new Date(start.getTime() + (selectedCourt?.slotDurationMinutes || 60) * 60000) }) });
      setNotice('New slot published.'); setSlotForm(form => ({ ...form, startTime: '' })); await loadDashboard();
      const from = new Date(); from.setHours(0, 0, 0, 0); const to = new Date(from.getTime() + 86400000);
      const data = await api(`/owner/venues/${selectedVenueId}/slots?from=${from.toISOString()}&to=${to.toISOString()}`); setVenueSlots(data.slots);
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };

  const navItems = [
    { key: 'dashboard', target: 'overview', icon: '▦', label: 'Dashboard' },
    { key: 'bookings', target: 'bookings', icon: '▤', label: 'Bookings' },
    { key: 'calendar', target: 'slots', icon: '▣', label: 'Calendar' },
    { key: 'manage-slots', target: 'slots', icon: '□', label: 'Manage Slots' },
    { key: 'courts', target: 'courts', icon: '◉', label: 'Sports & Courts' },
    { key: 'pricing', target: 'courts', icon: '◇', label: 'Pricing' },
    { key: 'venues', target: 'venues', icon: '⌂', label: 'Venue Profile' },
    { key: 'analytics', target: 'overview', icon: '☷', label: 'Analytics' },
    { key: 'customers', target: 'customers', icon: '◌', label: 'Customers' }
  ];
  const summary = dashboardData.summary || {};
  const scheduleCourts = dashboardData.courts || courts;
  const scheduleSlots = dashboardData.slots || [];
  const scheduleTimes = [...new Set(scheduleSlots.map(slot => new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })))];
  const scheduleSlot = (courtId, time) => scheduleSlots.find(slot => slot.court?._id === courtId && new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) === time);
  const sportCounts = scheduleCourts.reduce((acc, court) => { const sport = court.sportType === 'CUSTOM' ? court.customSportName : court.sportType; acc[sport] = (acc[sport] || 0) + 1; return acc; }, {});

  return <div className="owner-app">
    <aside className="owner-sidebar">
      <button className="owner-brand" onClick={() => navigate('/owner')}><span className="brand-mark">P</span><span>Play<span>Hub</span><small>OWNER</small></span></button>
      <p className="side-label">TURF OWNER</p>
      <nav>{navItems.map(item => <button key={item.key} className={view === item.target && ((item.target === 'overview' && item.key === 'dashboard') || !navItems.slice(0, navItems.indexOf(item)).some(previous => previous.target === item.target)) ? 'active' : ''} onClick={() => setView(item.target)}><i>{item.icon}</i>{item.label}{item.key === 'bookings' && bookings.length > 0 && <b>{bookings.length}</b>}</button>)}</nav>
      <div className="owner-grow-card"><strong>♛ Grow Your Business</strong><p>Get featured, run offers and attract more players.</p><button onClick={() => setView('venues')}>Upgrade Plan →</button></div>
      <div className="sidebar-bottom"><button onClick={() => { logout(); navigate('/'); }}>⇥ Log out</button><div className="owner-profile"><span>{user.name[0]}</span><div><strong>{user.name}</strong><small>Venue owner</small></div></div></div>
    </aside>

    <main className="owner-main">
      <header className="owner-topbar owner-reference-header"><div><p>Good Morning,</p><h1>{view === 'overview' ? selectedVenue?.name || 'Your venue' : navItems.find(item => item.target === view)?.label}</h1>{view === 'overview' && <small>⌖ {selectedVenue?.area || 'Surat'}</small>}</div><div><select className="venue-switcher" value={selectedVenueId} onChange={event => setSelectedVenueId(event.target.value)}>{venues.map(venue => <option key={venue._id} value={venue._id}>{venue.name}</option>)}</select><button className="notification-button" aria-label="Notifications">♢<b>3</b></button><span className="header-avatar">{user.name[0]}</span></div></header>
      {notice && <div className="owner-notice"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}

      {view === 'overview' && <><section className="owner-kpis reference-kpis">
        <article className="featured"><span className="kpi-icon lime">▣</span><small>TODAY'S BOOKINGS</small><strong>{summary.todayBookings || 0}</strong><p><b>↑ Live</b> confirmed today</p></article>
        <article><span className="kpi-icon lime">₹</span><small>TODAY'S REVENUE</small><strong>{formatMoney(summary.todayRevenue)}</strong><p>Successful payments</p></article>
        <article><span className="kpi-icon blue">◷</span><small>AVAILABLE SLOTS</small><strong>{summary.availableSlots || 0}</strong><p>Open across today's courts</p></article>
        <article><span className="kpi-icon violet">◌</span><small>TOTAL PLAYERS</small><strong>{summary.uniquePlayers || 0}</strong><p>Unique venue customers</p></article>
      </section>
      <section className="owner-dashboard-grid">
        <div className="owner-panel schedule-panel"><div className="panel-head"><div><h2>Today's Schedule</h2><p>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p></div><button onClick={() => setView('slots')}>View Calendar →</button></div>
          <div className="schedule-table" style={{ '--court-count': Math.max(scheduleCourts.length, 1) }}><div className="schedule-head"><b>Time</b>{scheduleCourts.map(court => <b key={court._id}>{court.name}</b>)}</div>{scheduleTimes.map(time => <div className="schedule-row" key={time}><time>{time}</time>{scheduleCourts.map(court => { const slot = scheduleSlot(court._id, time); const state = (slot?.status || 'EXPIRED').toLowerCase(); return <button key={court._id} className={`schedule-cell ${state}`} onClick={() => setView('slots')} disabled={!slot}><strong>{slot ? (slot.status === 'BOOKED' ? 'Booked' : slot.status[0] + slot.status.slice(1).toLowerCase()) : '—'}</strong>{slot?.booking && <small>{slot.booking.customer?.name}</small>}</button>; })}</div>)}</div>
          {!scheduleTimes.length && <p className="owner-empty">No operating slots today. Configure a court schedule to publish availability.</p>}<button className="schedule-manage" onClick={() => setView('slots')}>Manage All Slots →</button>
        </div>
        <div className="owner-panel dashboard-recent"><div className="panel-head"><div><h2>Recent Bookings</h2><p>For {selectedVenue?.name}</p></div><button onClick={() => setView('bookings')}>View All →</button></div>{dashboardData.recentBookings?.map(booking => <div className="recent-booking" key={booking._id}><span>{booking.customer?.name?.[0] || 'P'}</span><div><strong>{booking.customer?.name || 'Player'}</strong><small>{booking.court?.name} · {formatDate(booking.slot?.startTime)}</small></div><aside><b>{formatMoney(booking.amount)}</b><em>Confirmed</em></aside></div>)}{!dashboardData.recentBookings?.length && <p className="owner-empty">No bookings for this venue yet.</p>}<button className="schedule-manage" onClick={() => setView('bookings')}>View All Bookings →</button></div>
        <aside className="dashboard-rail"><article className="venue-summary-card"><div className="venue-summary-image" style={{ backgroundImage: `url('${selectedVenue?.image || ''}')` }}><button onClick={() => selectedVenue && beginEdit(selectedVenue)}>Edit Profile</button></div><h2>{selectedVenue?.name}</h2><p>⌖ {selectedVenue?.area}</p><strong>★ {selectedVenue?.rating || 4.8}</strong><div><span><b>{courts.length}</b> Courts</span><span><b>{Object.keys(sportCounts).length}</b> Sports</span><span><b>{selectedVenue?.openingTime || '06:00'}–{selectedVenue?.closingTime || '23:00'}</b> Hours</span></div></article><article className="quick-actions"><h2>Quick Actions</h2><div><button onClick={() => setView('slots')}>⊘<span>Block Slot</span></button><button onClick={() => setView('courts')}>◇<span>Update Price</span></button><button onClick={() => setView('courts')}>+▦<span>Add Court</span></button><button onClick={() => setView('courts')}>▦<span>Manage Courts</span></button><button onClick={() => setView('slots')}>▣<span>View Calendar</span></button><button onClick={() => setView('venues')}>↗<span>Edit Venue</span></button></div></article></aside>
      </section>
      <section className="owner-insights"><article className="owner-panel"><div className="panel-head"><div><h2>Booking Trends</h2><p>Recent booking activity</p></div><span className="result-count">Last 7 days</span></div><div className="trend-chart">{[2,4,3,6,5,7,8].map((height, index) => <div key={index}><i style={{ height: `${height * 9}px` }} /><span>{new Date(Date.now() - (6 - index) * 86400000).toLocaleDateString('en-IN', { weekday: 'short' })}</span></div>)}</div></article><article className="owner-panel"><div className="panel-head"><div><h2>Popular Sports</h2><p>Courts at this venue</p></div></div><div className="sports-overview"><div className="sport-donut"><b>{courts.length}</b><span>Total Courts</span></div><ul>{Object.entries(sportCounts).map(([sport, count]) => <li key={sport}><i />{sport}<b>{Math.round(count / Math.max(courts.length, 1) * 100)}%</b></li>)}</ul></div></article><article className="owner-panel"><div className="panel-head"><div><h2>Recent Customers</h2><p>Players at your venue</p></div><button onClick={() => setView('customers')}>View All →</button></div>{customers.slice(0, 3).map(customer => <div className="recent-booking" key={customer._id}><span>{customer.name?.[0]}</span><div><strong>{customer.name}</strong><small>{customer.totalBookings} bookings · {formatMoney(customer.totalSpend)}</small></div></div>)}{!customers.length && <p className="owner-empty">No customers yet.</p>}</article></section></>}

      {view === 'bookings' && <section className="owner-panel full"><div className="panel-head"><div><h2>Your turf bookings</h2><p>Customers booked only at venues listed by your account.</p></div><span className="result-count">{bookings.length} records</span></div><div className="owner-table-wrap"><table className="owner-data-table"><thead><tr><th>Customer</th><th>Venue</th><th>Date & time</th><th>Booking ID</th><th>Amount</th><th>Status</th></tr></thead><tbody>{bookings.map(booking => <tr key={booking._id}><td><strong>{booking.customer?.name}</strong><small>{booking.customer?.phone || booking.customer?.email}</small></td><td>{booking.venue?.name}<small>{booking.venue?.area}</small></td><td>{formatDate(booking.slot?.startTime)}</td><td>{booking.bookingCode}</td><td><strong>{formatMoney(booking.amount)}</strong></td><td><span className={`owner-status ${booking.status}`}>{booking.status}</span></td></tr>)}</tbody></table></div>{!bookings.length && <p className="owner-empty">No one has booked your turfs yet.</p>}</section>}

      {view === 'customers' && <section className="owner-panel full"><div className="panel-head"><div><h2>Venue customers</h2><p>Only players with bookings at {selectedVenue?.name} are shown.</p></div><span className="result-count">{customers.length} players</span></div><div className="owner-table-wrap"><table className="owner-data-table"><thead><tr><th>Player</th><th>Contact</th><th>Total bookings</th><th>Confirmed</th><th>Cancelled</th><th>Total spend</th><th>Last booking</th></tr></thead><tbody>{customers.map(customer => <tr key={customer._id}><td><strong>{customer.name}</strong></td><td>{customer.phone || customer.email}</td><td>{customer.totalBookings}</td><td>{customer.completedBookings}</td><td>{customer.cancelledBookings}</td><td><strong>{formatMoney(customer.totalSpend)}</strong></td><td>{formatDate(customer.lastBooking)}</td></tr>)}</tbody></table></div>{!customers.length && <p className="owner-empty">No customers have booked this venue yet.</p>}</section>}

      {view === 'slots' && <section className="slot-layout"><div className="owner-panel slot-calendar"><div className="panel-head"><div><h2>Today's slots</h2><p>Booked, held, blocked and available inventory for today only</p></div><select value={selectedVenueId} onChange={event => setSelectedVenueId(event.target.value)}>{venues.map(venue => <option key={venue._id} value={venue._id}>{venue.name}</option>)}</select></div><div className="slot-list">{venueSlots.map(slot => <article key={slot._id} className={slot.status.toLowerCase()}><time><strong>{new Date(slot.startTime).toLocaleDateString('en-IN', { weekday: 'short' })}</strong><span>{new Date(slot.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span></time><div><strong>{new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong><small>{slot.court?.name} · {formatMoney(slot.price)}</small></div>{slot.booking ? <div className="slot-player"><span>{slot.booking.customer?.name?.[0]}</span><div><strong>{slot.booking.customer?.name}</strong><small>{slot.booking.bookingCode}</small></div></div> : <span className={`owner-status ${slot.status.toLowerCase()}`}>{slot.status}</span>}</article>)}{!venueSlots.length && <p className="owner-empty">No slots configured for today.</p>}</div></div>
        <form className="owner-panel owner-form" onSubmit={createSlot}><div className="panel-head"><div><h2>Add a one-off slot</h2><p>Publish availability for a specific court</p></div></div>{!courts.length ? <p className="owner-empty">Create a court first.</p> : <><label>VENUE<select value={selectedVenueId} onChange={event => setSelectedVenueId(event.target.value)}>{venues.map(venue => <option key={venue._id} value={venue._id}>{venue.name}</option>)}</select></label><label>COURT<select value={slotForm.courtId} onChange={event => setSlotForm({ ...slotForm, courtId: event.target.value })}>{courts.filter(court => court.active).map(court => <option key={court._id} value={court._id}>{court.name}</option>)}</select></label><label>START DATE & TIME<input required type="datetime-local" value={slotForm.startTime} onChange={event => setSlotForm({ ...slotForm, startTime: event.target.value })} /></label><label>PRICE (₹)<input required min="0" type="number" value={slotForm.price} onChange={event => setSlotForm({ ...slotForm, price: event.target.value })} /></label><button className="owner-primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish slot →'}</button></>}</form></section>}

      {view === 'courts' && <section className="venue-management"><div className="venue-owned-list"><div className="venue-section-head"><div><h2>Sports & courts</h2><p>Each court has its own type, price and schedule.</p></div><select value={selectedVenueId} onChange={event => setSelectedVenueId(event.target.value)}>{venues.map(venue => <option key={venue._id} value={venue._id}>{venue.name}</option>)}</select></div>{courts.map(court => <article className="court-manage-card" key={court._id}><div className={`court-sport-icon ${court.sportType.toLowerCase()}`}>◉</div><div><span>{court.sportType === 'CUSTOM' ? court.customSportName : court.sportType}</span><h3>{court.name}</h3><p>{court.slotDurationMinutes} minute slots · {court.weeklySchedule.filter(day => day.enabled).length} operating days</p></div><label>BASE PRICE<input type="number" min="0" defaultValue={court.defaultPrice} onBlur={event => Number(event.target.value) !== court.defaultPrice && updateCourt(court, { defaultPrice: Number(event.target.value), applyPriceToFutureSlots: true })} /></label><button className={court.active ? 'court-active' : 'court-paused'} onClick={() => updateCourt(court, { active: !court.active })}>{court.active ? '● Active' : 'Paused'}</button></article>)}{!courts.length && <p className="owner-empty">No courts at this venue yet.</p>}</div>
        <form className="owner-panel owner-form venue-editor" onSubmit={createCourt}><div className="panel-head"><div><h2>Add a court or turf</h2><p>30 days of slots will be generated automatically.</p></div></div><label>VENUE<select value={selectedVenueId} onChange={event => setSelectedVenueId(event.target.value)}>{venues.map(venue => <option key={venue._id} value={venue._id}>{venue.name}</option>)}</select></label><label>COURT NAME<input required value={courtForm.name} onChange={event => setCourtForm({ ...courtForm, name: event.target.value })} placeholder="e.g. Cricket Turf 2" /></label><label>SPORT TYPE<select value={courtForm.sportType} onChange={event => setCourtForm({ ...courtForm, sportType: event.target.value })}><option value="CRICKET">Cricket</option><option value="FOOTBALL">Football</option><option value="PICKLEBALL">Pickleball</option><option value="BADMINTON">Badminton</option><option value="TENNIS">Tennis</option><option value="CUSTOM">Custom sport</option></select></label>{courtForm.sportType === 'CUSTOM' && <label>CUSTOM SPORT NAME<input required value={courtForm.customSportName} onChange={event => setCourtForm({ ...courtForm, customSportName: event.target.value })} /></label>}<label>DEFAULT PRICE (₹)<input required type="number" min="0" value={courtForm.defaultPrice} onChange={event => setCourtForm({ ...courtForm, defaultPrice: Number(event.target.value) })} /></label><label>SLOT DURATION<select value={courtForm.slotDurationMinutes} onChange={event => setCourtForm({ ...courtForm, slotDurationMinutes: Number(event.target.value) })}><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select></label><button className="owner-primary" disabled={busy || !selectedVenueId}>{busy ? 'Creating…' : 'Create court →'}</button></form></section>}

      {view === 'venues' && <section className="venue-management"><div className="venue-owned-list"><div className="venue-section-head"><div><h2>Your listed venues</h2><p>Only properties owned by this account.</p></div><span>{venues.length} venues</span></div>{venues.map(venue => <article className="owner-venue-card" key={venue._id}><div className="owner-venue-image" style={{ backgroundImage: `url('${venue.image}')` }}><span className={venue.active ? 'active' : 'paused'}>{venue.active ? '● Active' : 'Paused'}</span></div><div><h3>{venue.name}</h3><p>⌖ {venue.area}</p><div className="owner-sport-tags">{venue.sports.map(sport => <span key={sport}>{sport}</span>)}</div><footer><strong>{formatMoney(venue.pricePerHour)}<small>/hour</small></strong><button onClick={() => beginEdit(venue)}>Edit venue →</button></footer></div></article>)}</div>
        <form className="owner-panel owner-form venue-editor" onSubmit={saveVenue}><div className="panel-head"><div><h2>{editingId ? 'Edit venue' : 'List a new venue'}</h2><p>{editingId ? 'Update information visible to players.' : 'Add another turf to your account.'}</p></div>{editingId && <button type="button" onClick={() => { setEditingId(null); setVenueForm(emptyVenue); }}>Cancel</button>}</div><label>VENUE NAME<input required value={venueForm.name} onChange={event => setVenueForm({ ...venueForm, name: event.target.value })} placeholder="e.g. Arena Sports Club" /></label><label>AREA<input required value={venueForm.area} onChange={event => setVenueForm({ ...venueForm, area: event.target.value })} placeholder="e.g. Vesu, Surat" /></label><label>FULL ADDRESS<textarea required value={venueForm.address} onChange={event => setVenueForm({ ...venueForm, address: event.target.value })} /></label><label>IMAGE URL<input value={venueForm.image || ''} onChange={event => setVenueForm({ ...venueForm, image: event.target.value })} placeholder="https://…" /></label><label>SPORTS</label><div className="sport-checks">{sports.map(sport => <button type="button" key={sport} className={venueForm.sports.includes(sport) ? 'selected' : ''} onClick={() => toggleSport(sport)}>{venueForm.sports.includes(sport) ? '✓ ' : '+ '}{sport}</button>)}</div><div className="venue-hours-fields"><label>OPENING TIME<input required type="time" value={venueForm.openingTime} onChange={event => setVenueForm({ ...venueForm, openingTime: event.target.value })} /></label><label>CLOSING TIME<input required type="time" min={venueForm.openingTime} value={venueForm.closingTime} onChange={event => setVenueForm({ ...venueForm, closingTime: event.target.value })} /></label></div><label>PRICE PER HOUR (₹)<input required min="0" type="number" value={venueForm.pricePerHour} onChange={event => setVenueForm({ ...venueForm, pricePerHour: Number(event.target.value) })} /></label><label className="active-toggle"><input type="checkbox" checked={venueForm.active} onChange={event => setVenueForm({ ...venueForm, active: event.target.checked })} /> Accept new bookings</label><button className="owner-primary" disabled={busy || !venueForm.sports.length}>{busy ? 'Saving…' : editingId ? 'Save changes →' : 'List venue →'}</button></form></section>}
    </main>
  </div>;
}
