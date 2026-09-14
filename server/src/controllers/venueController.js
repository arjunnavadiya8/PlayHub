import Venue from '../models/Venue.js';
import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';
import Court from '../models/Court.js';
import { writeAudit } from '../services/auditService.js';
import { generateCourtSlots } from '../services/slotGenerationService.js';

const venueFields = ['name', 'area', 'address', 'sports', 'pricePerHour', 'openingTime', 'closingTime', 'image', 'active'];
const safeVenueInput = body => Object.fromEntries(venueFields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
const operatingSchedule = (court, openingTime, closingTime) => Array.from({ length: 7 }, (_, dayOfWeek) => {
  const existing = court?.weeklySchedule?.find(day => day.dayOfWeek === dayOfWeek);
  return { dayOfWeek, enabled: existing?.enabled ?? true, openTime: openingTime, closeTime: closingTime };
});
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slotWindow = (dateValue, timeValue) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue || '') ? dateValue : new Date().toISOString().slice(0, 10);
  if (timeValue && !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) return null;
  const from = new Date(`${date}T${timeValue || '00:00'}:00`);
  const to = timeValue ? new Date(from.getTime() + 60000) : new Date(`${date}T23:59:59.999`);
  return Number.isNaN(from.getTime()) ? null : { from, to };
};

export async function listVenues(req, res, next) {
  try {
    const query = { active: true };
    if (req.query.sport && req.query.sport !== 'All') query.sports = req.query.sport;
    const areaSearch = req.query.area?.trim();
    if (areaSearch && !/^surat(?:,\s*gujarat)?$/i.test(areaSearch)) {
      const location = new RegExp(escapeRegex(areaSearch), 'i');
      query.$or = [{ area: location }, { address: location }, { name: location }];
    }
    const venues = await Venue.find(query).sort({ rating: -1 }).lean();
    const shouldFilterAvailability = Boolean(req.query.date || req.query.time);
    if (!shouldFilterAvailability || !venues.length) return res.json({ venues });
    const window = slotWindow(req.query.date, req.query.time);
    if (!window) return res.status(400).json({ message: 'Use a valid date and time' });
    const slotQuery = {
      venue: { $in: venues.map(venue => venue._id) },
      status: 'AVAILABLE',
      startTime: { $gte: window.from, $lte: window.to }
    };
    if (req.query.sport && req.query.sport !== 'All') slotQuery.sport = new RegExp(`^${escapeRegex(req.query.sport)}$`, 'i');
    const slots = await Slot.find(slotQuery).sort({ startTime: 1, price: 1 }).lean();
    const availability = slots.reduce((map, slot) => {
      const key = slot.venue.toString();
      const current = map.get(key) || { availableSlotCount: 0, nextAvailableSlot: null, fromPrice: null };
      current.availableSlotCount += 1;
      current.nextAvailableSlot ||= slot.startTime;
      current.fromPrice = current.fromPrice === null ? slot.price : Math.min(current.fromPrice, slot.price);
      map.set(key, current); return map;
    }, new Map());
    res.json({
      venues: venues.filter(venue => availability.has(venue._id.toString())).map(venue => ({ ...venue, ...availability.get(venue._id.toString()) })),
      filters: { area: req.query.area || '', sport: req.query.sport || 'All', date: req.query.date, time: req.query.time || '' }
    });
  } catch (error) { next(error); }
}
export async function listVenueAreas(req, res, next) {
  try {
    const areas = await Venue.distinct('area', { active: true });
    res.json({ areas: areas.filter(Boolean).sort((first, second) => first.localeCompare(second)) });
  } catch (error) { next(error); }
}
export async function getVenue(req, res, next) {
  try { const venue = await Venue.findOne({ _id: req.params.id, active: true }); return venue ? res.json({ venue }) : res.status(404).json({ message: 'Venue not found' }); } catch (e) { next(e); }
}
export async function getSlots(req, res, next) {
  try {
    const window = slotWindow(req.query.date, req.query.time);
    if (!window) return res.status(400).json({ message: 'Use a valid date and time' });
    const query = { venue: req.params.id, startTime: { $gte: window.from, $lte: window.to }, status: 'AVAILABLE' };
    if (req.query.sport && req.query.sport !== 'All') query.sport = new RegExp(`^${escapeRegex(req.query.sport)}$`, 'i');
    const slots = await Slot.find(query).populate('court', 'name sportType customSportName').sort({ startTime: 1 });
    res.json({ slots });
  } catch (e) { next(e); }
}
export async function ownerVenues(req, res, next) { try { res.json({ venues: await Venue.find({ owner: req.user._id }) }); } catch (e) { next(e); } }
export async function ownerSlots(req, res, next) {
  try {
    const venue = await Venue.findOne({ _id: req.params.id, owner: req.user._id });
    if (!venue) return res.status(404).json({ message: 'Venue not found or not owned by you' });
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 86400000);
    const slots = await Slot.find({ venue: venue._id, startTime: { $gte: from, $lt: to } }).sort({ startTime: 1 }).lean();
    const bookings = await Booking
      .find({ owner: req.user._id, slot: { $in: slots.map(slot => slot._id) }, status: { $in: ['PENDING_PAYMENT', 'CONFIRMED'] } })
      .populate('customer', 'name phone email').lean();
    const bookingBySlot = new Map(bookings.map(booking => [booking.slot.toString(), booking]));
    res.json({ venue, slots: slots.map(slot => ({ ...slot, booking: bookingBySlot.get(slot._id.toString()) || null })) });
  } catch (e) { next(e); }
}
export async function createVenue(req, res, next) { try { const venue = await Venue.create({ ...safeVenueInput(req.body), owner: req.user._id }); await writeAudit({ actor: req.user, venue: venue._id, action: 'VENUE_CREATED', entityType: 'Venue', entityId: venue._id }); res.status(201).json({ venue }); } catch (e) { next(e); } }
export async function updateVenue(req, res, next) {
  try {
    const safe = safeVenueInput(req.body);
    const venue = await Venue.findOne({ _id: req.params.id, owner: req.user._id });
    if (!venue) return res.status(404).json({ message: 'Venue not found or not owned by you' });
    Object.assign(venue, safe);
    await venue.save();
    let courtsUpdated = 0;
    if (safe.openingTime !== undefined || safe.closingTime !== undefined) {
      const courts = await Court.find({ venue: venue._id });
      for (const court of courts) {
        court.weeklySchedule = operatingSchedule(court, venue.openingTime, venue.closingTime);
        await court.save();
        await generateCourtSlots(court);
      }
      courtsUpdated = courts.length;
    }
    await writeAudit({ actor: req.user, venue: venue._id, action: 'VENUE_UPDATED', entityType: 'Venue', entityId: venue._id, metadata: { changedFields: Object.keys(safe) } });
    return res.json({ venue, courtsUpdated });
  } catch (e) { next(e); }
}
export async function createSlot(req, res, next) {
  try {
    const venue = await Venue.findOne({ _id: req.params.id, owner: req.user._id });
    if (!venue) return res.status(404).json({ message: 'Venue not found or not owned by you' });
    const court = await Court.findOne({ _id: req.body.courtId, venue: venue._id, active: true });
    if (!court) return res.status(404).json({ message: 'Court not found at this venue' });
    const { startTime, endTime, price = court.defaultPrice } = req.body;
    const sport = court.sportType === 'CUSTOM' ? court.customSportName : court.sportType[0] + court.sportType.slice(1).toLowerCase();
    res.status(201).json({ slot: await Slot.create({ venue: venue._id, court: court._id, startTime, endTime, sport, price, status: 'AVAILABLE', source: 'MANUAL' }) });
  } catch (e) { next(e); }
}
