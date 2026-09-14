import Booking from '../models/Booking.js';
import Court from '../models/Court.js';
import Slot from '../models/Slot.js';
import Venue from '../models/Venue.js';
import { writeAudit } from '../services/auditService.js';
import { courtSportName, generateCourtSlots } from '../services/slotGenerationService.js';

const venueFilter = (user, venueId) => user.role === 'admin' ? { _id: venueId } : { _id: venueId, owner: user._id };
const ownVenue = (user, venueId) => Venue.findOne(venueFilter(user, venueId));
const ownCourt = async (user, courtId) => {
  const court = await Court.findById(courtId); if (!court) return null;
  return (await ownVenue(user, court.venue)) ? court : null;
};
const syncVenueSports = async venueId => {
  const courts = await Court.find({ venue: venueId, active: true });
  await Venue.updateOne({ _id: venueId }, { sports: [...new Set(courts.map(courtSportName))] });
};

export async function listCourts(req, res, next) {
  try { const venue = await ownVenue(req.user, req.params.venueId); if (!venue) return res.status(404).json({ message: 'Venue not found' }); res.json({ courts: await Court.find({ venue: venue._id }).sort({ name: 1 }) }); } catch (e) { next(e); }
}
export async function createCourt(req, res, next) {
  try {
    const venue = await ownVenue(req.user, req.params.venueId); if (!venue) return res.status(404).json({ message: 'Venue not found' });
    const submittedSchedule = Array.isArray(req.body.weeklySchedule) ? req.body.weeklySchedule : [];
    const weeklySchedule = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      enabled: submittedSchedule.find(day => day.dayOfWeek === dayOfWeek)?.enabled ?? true,
      openTime: venue.openingTime || '06:00',
      closeTime: venue.closingTime || '23:00'
    }));
    const court = await Court.create({ ...req.body, venue: venue._id, weeklySchedule });
    const generation = await generateCourtSlots(court); await syncVenueSports(venue._id);
    await writeAudit({ actor: req.user, venue: venue._id, action: 'COURT_CREATED', entityType: 'Court', entityId: court._id, metadata: { name: court.name, sportType: court.sportType } });
    res.status(201).json({ court, generation });
  } catch (e) { next(e); }
}
export async function updateCourt(req, res, next) {
  try {
    const court = await ownCourt(req.user, req.params.courtId); if (!court) return res.status(404).json({ message: 'Court not found' });
    const allowed = ['name', 'sportType', 'customSportName', 'defaultPrice', 'slotDurationMinutes', 'active'];
    for (const key of allowed) if (req.body[key] !== undefined) court[key] = req.body[key];
    await court.save();
    if (req.body.applyPriceToFutureSlots) await Slot.updateMany({ court: court._id, startTime: { $gt: new Date() }, status: 'AVAILABLE' }, { price: court.defaultPrice });
    await syncVenueSports(court.venue);
    await writeAudit({ actor: req.user, venue: court.venue, action: req.body.defaultPrice !== undefined ? 'PRICE_UPDATED' : 'COURT_UPDATED', entityType: 'Court', entityId: court._id, metadata: { changedFields: allowed.filter(key => req.body[key] !== undefined) } });
    res.json({ court });
  } catch (e) { next(e); }
}
export async function updateSchedule(req, res, next) {
  try {
    const court = await ownCourt(req.user, req.params.courtId); if (!court) return res.status(404).json({ message: 'Court not found' });
    court.weeklySchedule = req.body.weeklySchedule; await court.save();
    const generation = await generateCourtSlots(court);
    await writeAudit({ actor: req.user, venue: court.venue, action: 'COURT_SCHEDULE_UPDATED', entityType: 'Court', entityId: court._id, metadata: { generatedThrough: generation.generatedThrough } });
    res.json({ court, generation });
  } catch (e) { next(e); }
}
export async function listOwnerSlots(req, res, next) {
  try {
    const venue = await ownVenue(req.user, req.params.venueId); if (!venue) return res.status(404).json({ message: 'Venue not found' });
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 86400000);
    const query = { venue: venue._id, startTime: { $gte: from, $lt: to } }; if (req.query.courtId) query.court = req.query.courtId;
    const slots = await Slot.find(query).populate('court', 'name sportType customSportName').sort({ startTime: 1 }).lean();
    const bookings = await Booking.find({ owner: venue.owner, slot: { $in: slots.map(slot => slot._id) }, status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] } }).populate('customer', 'name email phone').lean();
    const bySlot = new Map(bookings.map(booking => [booking.slot.toString(), booking]));
    res.json({ slots: slots.map(slot => ({ ...slot, booking: bySlot.get(slot._id.toString()) || null })) });
  } catch (e) { next(e); }
}
export async function changeSlotState(req, res, next) {
  try {
    const slot = await Slot.findById(req.params.slotId).populate('court'); if (!slot || !(await ownVenue(req.user, slot.venue))) return res.status(404).json({ message: 'Slot not found' });
    if (slot.status === 'BOOKED' || slot.status === 'HELD') return res.status(409).json({ message: 'Booked or held slots cannot be changed' });
    const transitions = { block: 'BLOCKED', unblock: 'AVAILABLE', maintenance: 'MAINTENANCE', available: 'AVAILABLE' };
    const nextStatus = transitions[req.params.action]; if (!nextStatus) return res.status(400).json({ message: 'Invalid slot action' });
    slot.status = nextStatus; slot.blockReason = req.body.reason || undefined; await slot.save();
    await writeAudit({ actor: req.user, venue: slot.venue, action: `SLOT_${nextStatus}`, entityType: 'Slot', entityId: slot._id, metadata: { courtId: slot.court._id, reason: req.body.reason } });
    res.json({ slot });
  } catch (e) { next(e); }
}
export async function venueBookings(req, res, next) {
  try {
    const venue = await ownVenue(req.user, req.params.venueId); if (!venue) return res.status(404).json({ message: 'Venue not found' });
    const query = { venue: venue._id }; if (req.query.status) query.status = req.query.status; if (req.query.courtId) query.court = req.query.courtId;
    const bookings = await Booking.find(query).populate('customer', 'name email phone').populate('court', 'name sportType customSportName').populate('slot').sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (e) { next(e); }
}
export async function venueDashboard(req, res, next) {
  try {
    const venue = await ownVenue(req.user, req.params.venueId); if (!venue) return res.status(404).json({ message: 'Venue not found' });
    const start = req.query.date ? new Date(`${req.query.date}T00:00:00`) : new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start.getTime() + 86400000);
    const [courts, slots, bookings] = await Promise.all([Court.find({ venue: venue._id, active: true }).lean(), Slot.find({ venue: venue._id, startTime: { $gte: start, $lt: end } }).populate('court', 'name sportType customSportName').lean(), Booking.find({ venue: venue._id, status: { $in: ['CONFIRMED', 'REFUNDED', 'CANCELLED'] } }).populate('customer', 'name email phone').populate('court', 'name sportType customSportName').populate('slot').sort({ createdAt: -1 }).lean()]);
    const todayBookings = bookings.filter(item => item.slot?.startTime >= start && item.slot?.startTime < end && item.status === 'CONFIRMED');
    const bookingBySlot = new Map(todayBookings.map(item => [item.slot._id.toString(), item]));
    res.json({ venue, courts, summary: { todayBookings: todayBookings.length, todayRevenue: todayBookings.filter(item => item.paymentStatus === 'PAID').reduce((sum, item) => sum + item.amount, 0), availableSlots: slots.filter(slot => slot.status === 'AVAILABLE').length, uniquePlayers: new Set(bookings.map(item => item.customer?._id?.toString()).filter(Boolean)).size }, slots: slots.map(slot => ({ ...slot, booking: bookingBySlot.get(slot._id.toString()) || null })), recentBookings: bookings.slice(0, 6) });
  } catch (e) { next(e); }
}
export async function venueCustomers(req, res, next) {
  try {
    const venue = await ownVenue(req.user, req.params.venueId); if (!venue) return res.status(404).json({ message: 'Venue not found' });
    const rows = await Booking.aggregate([{ $match: { venue: venue._id } }, { $group: { _id: '$customer', totalBookings: { $sum: 1 }, completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'CONFIRMED'] }, 1, 0] } }, cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } }, totalSpend: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$amount', 0] } }, lastBooking: { $max: '$createdAt' } } }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $project: { name: '$user.name', email: '$user.email', phone: '$user.phone', totalBookings: 1, completedBookings: 1, cancelledBookings: 1, totalSpend: 1, lastBooking: 1 } }]);
    res.json({ customers: rows });
  } catch (e) { next(e); }
}
