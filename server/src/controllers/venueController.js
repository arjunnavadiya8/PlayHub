import Venue from '../models/Venue.js';
import Slot from '../models/Slot.js';

export async function listVenues(req, res, next) {
  try {
    const query = { active: true };
    if (req.query.sport && req.query.sport !== 'All') query.sports = req.query.sport;
    if (req.query.area) query.area = new RegExp(req.query.area, 'i');
    res.json({ venues: await Venue.find(query).sort({ rating: -1 }).lean() });
  } catch (error) { next(error); }
}
export async function getVenue(req, res, next) {
  try { const venue = await Venue.findOne({ _id: req.params.id, active: true }); return venue ? res.json({ venue }) : res.status(404).json({ message: 'Venue not found' }); } catch (e) { next(e); }
}
export async function getSlots(req, res, next) {
  try {
    const from = req.query.date ? new Date(`${req.query.date}T00:00:00`) : new Date();
    const to = new Date(from); to.setDate(to.getDate() + 1);
    const slots = await Slot.find({ venue: req.params.id, startTime: { $gte: from, $lt: to }, isBooked: false }).sort({ startTime: 1 });
    res.json({ slots });
  } catch (e) { next(e); }
}
export async function ownerVenues(req, res, next) { try { res.json({ venues: await Venue.find({ owner: req.user._id }) }); } catch (e) { next(e); } }
export async function createVenue(req, res, next) { try { res.status(201).json({ venue: await Venue.create({ ...req.body, owner: req.user._id }) }); } catch (e) { next(e); } }
export async function updateVenue(req, res, next) {
  try {
    const safe = (({ name, area, address, sports, pricePerHour, image, active }) => ({ name, area, address, sports, pricePerHour, image, active }))(req.body);
    Object.keys(safe).forEach(k => safe[k] === undefined && delete safe[k]);
    const venue = await Venue.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, safe, { new: true, runValidators: true });
    return venue ? res.json({ venue }) : res.status(404).json({ message: 'Venue not found or not owned by you' });
  } catch (e) { next(e); }
}
export async function createSlot(req, res, next) {
  try {
    const venue = await Venue.findOne({ _id: req.params.id, owner: req.user._id });
    if (!venue) return res.status(404).json({ message: 'Venue not found or not owned by you' });
    const { startTime, endTime, sport, price = venue.pricePerHour } = req.body;
    if (!venue.sports.includes(sport)) return res.status(400).json({ message: 'Sport is not offered at this venue' });
    res.status(201).json({ slot: await Slot.create({ venue: venue._id, startTime, endTime, sport, price }) });
  } catch (e) { next(e); }
}
