import Booking from '../models/Booking.js';
import Slot from '../models/Slot.js';
import Venue from '../models/Venue.js';

export async function createBooking(req, res, next) {
  let lockedSlot;
  try {
    lockedSlot = await Slot.findOneAndUpdate({ _id: req.body.slotId, isBooked: false, startTime: { $gt: new Date() } }, { isBooked: true }, { new: true });
    if (!lockedSlot) return res.status(409).json({ message: 'This slot is no longer available' });
    const venue = await Venue.findById(lockedSlot.venue);
    if (!venue?.active) { await Slot.updateOne({ _id: lockedSlot._id }, { isBooked: false }); return res.status(400).json({ message: 'Venue is unavailable' }); }
    const booking = await Booking.create({ customer: req.user._id, owner: venue.owner, venue: venue._id, slot: lockedSlot._id, amount: lockedSlot.price, bookingCode: `PH${Date.now().toString(36).toUpperCase()}` });
    res.status(201).json({ booking: await booking.populate(['venue', 'slot']) });
  } catch (error) { if (lockedSlot) await Slot.updateOne({ _id: lockedSlot._id }, { isBooked: false }); next(error); }
}
export async function myBookings(req, res, next) {
  try { res.json({ bookings: await Booking.find({ customer: req.user._id }).populate('venue').populate('slot').sort({ createdAt: -1 }) }); } catch (e) { next(e); }
}
export async function ownerBookings(req, res, next) {
  try {
    // Critical security boundary: the owner id is always taken from the verified JWT, never a request parameter.
    const bookings = await Booking.find({ owner: req.user._id }).populate('customer', 'name email phone').populate('venue', 'name area').populate('slot').sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (e) { next(e); }
}
export async function cancelBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const permitted = booking.customer.equals(req.user._id) || (req.user.role === 'owner' && booking.owner.equals(req.user._id));
    if (!permitted) return res.status(403).json({ message: 'You cannot modify this booking' });
    if (booking.status !== 'confirmed') return res.status(400).json({ message: 'Booking is not active' });
    booking.status = 'cancelled'; booking.paymentStatus = 'refunded'; await booking.save();
    await Slot.updateOne({ _id: booking.slot }, { isBooked: false });
    res.json({ booking });
  } catch (e) { next(e); }
}
