const formatTime = value => value ? new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null;

export default function VenueCard({ venue, onBook }) {
  return <article className="venue-card">
    <div className="venue-image" style={{ backgroundImage: `url('${venue.image}')` }}><span className="rating"><b>★</b> {venue.rating?.toFixed(1)}</span><button className="heart" aria-label={`Save ${venue.name}`}>♡</button></div>
    <div className="venue-body"><h3>{venue.name}</h3><p className="place">⌖ {venue.area}</p><div className="tags">{venue.sports.map(sport => <span key={sport}>{sport}</span>)}</div>
      {venue.availableSlotCount !== undefined && <div className="availability-line"><span>● {venue.availableSlotCount} slots available</span>{venue.nextAvailableSlot && <b>Next {formatTime(venue.nextAvailableSlot)}</b>}</div>}
      <div className="card-bottom"><div className="price"><strong>₹{venue.fromPrice ?? venue.pricePerHour}</strong> <small>/ hour</small></div><button className="slot-btn" onClick={() => onBook(venue)}>View slots →</button></div>
    </div>
  </article>;
}
