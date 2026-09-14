import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Court from '../models/Court.js';
import Slot from '../models/Slot.js';
import Venue from '../models/Venue.js';
import { writeAudit } from '../services/auditService.js';
import { NotificationService } from '../services/notificationService.js';

const populated = query => query.populate('customer', 'name email phone').populate('venue', 'name area').populate('court', 'name sportType customSportName').populate('slot');

export async function holdSlot(req, res, next) {
  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      const expiresAt = new Date(Date.now() + 5 * 60000);
      const holdUpdate = { $set: { status: 'HELD', heldBy: req.user._id, holdExpiresAt: expiresAt } };
      let slot;
      let venue;
      if (req.body.slotId) {
        slot = await Slot.findOneAndUpdate({ _id: req.body.slotId, status: 'AVAILABLE', startTime: { $gt: new Date() } }, holdUpdate, { new: true, session });
      } else {
        const startTime = new Date(req.body.startTime);
        const sport = typeof req.body.sport === 'string' ? req.body.sport.trim() : '';
        if (!req.body.venueId || !sport || sport.length > 50 || Number.isNaN(startTime.getTime())) {
          const error = new Error('Venue, sport and start time are required'); error.statusCode = 400; throw error;
        }
        venue = await Venue.findOne({ _id: req.body.venueId, active: true }).session(session);
        if (!venue) { const error = new Error('Venue is unavailable'); error.statusCode = 404; throw error; }
        const activeCourtIds = await Court.distinct('_id', { venue: venue._id, active: true }).session(session);
        slot = await Slot.findOneAndUpdate(
          { venue: venue._id, court: { $in: activeCourtIds }, sport, status: 'AVAILABLE', startTime: { $eq: startTime, $gt: new Date() } },
          holdUpdate,
          { new: true, session, sort: { price: 1, _id: 1 } }
        );
      }
      if (!slot) { const error = new Error('All courts for this time are now booked'); error.statusCode = 409; throw error; }
      const [resolvedVenue, court] = await Promise.all([venue || Venue.findById(slot.venue).session(session), Court.findById(slot.court).session(session)]);
      venue = resolvedVenue;
      if (!venue?.active || !court?.active) { const error = new Error('Venue or court is unavailable'); error.statusCode = 400; throw error; }
      [booking] = await Booking.create([{ customer: req.user._id, owner: venue.owner, venue: venue._id, court: court._id, slot: slot._id, amount: slot.price, expiresAt, bookingCode: `PH${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}` }], { session });
    });
    res.status(201).json({ booking, holdExpiresAt: booking.expiresAt });
  } catch (error) { next(error); } finally { await session.endSession(); }
}

export async function confirmBooking(req, res, next) {
  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id, status: 'PENDING_PAYMENT', expiresAt: { $gt: new Date() } }).session(session);
      if (!booking) { const error = new Error('Booking hold has expired or is invalid'); error.statusCode = 409; throw error; }
      const slot = await Slot.findOneAndUpdate({ _id: booking.slot, status: 'HELD', heldBy: req.user._id, holdExpiresAt: { $gt: new Date() } }, { $set: { status: 'BOOKED' }, $unset: { heldBy: 1, holdExpiresAt: 1 } }, { new: true, session });
      if (!slot) { const error = new Error('Slot hold has expired'); error.statusCode = 409; throw error; }
      booking.status = 'CONFIRMED'; booking.paymentStatus = 'PAID'; await booking.save({ session });
      const court = await Court.findById(booking.court).session(session);
      await NotificationService.bookingConfirmed({ ownerId: booking.owner, venueId: booking.venue, booking, court, session });
      await writeAudit({ actor: req.user, venue: booking.venue, action: 'BOOKING_CONFIRMED', entityType: 'Booking', entityId: booking._id, metadata: { courtId: booking.court, slotId: booking.slot }, session });
    });
    res.json({ booking: await populated(Booking.findById(booking._id)) });
  } catch (error) { next(error); } finally { await session.endSession(); }
}

export async function failPayment(req, res, next) {
  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id, status: 'PENDING_PAYMENT' }).session(session);
      if (!booking) { const error = new Error('Pending booking not found'); error.statusCode = 404; throw error; }
      booking.status = 'PAYMENT_FAILED'; booking.paymentStatus = 'FAILED'; await booking.save({ session });
      await Slot.updateOne({ _id: booking.slot, status: 'HELD', heldBy: req.user._id }, { $set: { status: 'AVAILABLE' }, $unset: { heldBy: 1, holdExpiresAt: 1 } }, { session });
    });
    res.json({ booking });
  } catch (error) { next(error); } finally { await session.endSession(); }
}

export async function myBookings(req, res, next) { try { res.json({ bookings: await populated(Booking.find({ customer: req.user._id }).sort({ createdAt: -1 })) }); } catch (e) { next(e); } }
export async function ownerBookings(req, res, next) { try { res.json({ bookings: await populated(Booking.find({ owner: req.user._id }).sort({ createdAt: -1 })) }); } catch (e) { next(e); } }

export async function ownerAnalytics(req, res, next) {
  try {
    const venues = await Venue.find({ owner: req.user._id }).lean(); const venueIds = venues.map(item => item._id);
    const from = new Date(); from.setHours(0, 0, 0, 0); const to = new Date(from.getTime() + 30 * 86400000);
    const [slots, bookings] = await Promise.all([Slot.find({ venue: { $in: venueIds }, startTime: { $gte: from, $lt: to } }).lean(), Booking.find({ owner: req.user._id }).populate('slot').lean()]);
    const confirmed = bookings.filter(item => item.status === 'CONFIRMED' && item.paymentStatus === 'PAID');
    const perVenue = venues.map(venue => { const venueSlots = slots.filter(slot => slot.venue.equals(venue._id)); const venueBookings = confirmed.filter(item => item.venue.equals(venue._id)); const operational = venueSlots.filter(slot => !['BLOCKED', 'MAINTENANCE', 'EXPIRED'].includes(slot.status)); const booked = operational.filter(slot => slot.status === 'BOOKED').length; return { venueId: venue._id, name: venue.name, totalSlots: operational.length, bookedSlots: booked, occupancy: operational.length ? Math.round(booked / operational.length * 100) : 0, revenue: venueBookings.reduce((sum, item) => sum + item.amount, 0) }; });
    const operational = slots.filter(slot => !['BLOCKED', 'MAINTENANCE', 'EXPIRED'].includes(slot.status)); const booked = operational.filter(slot => slot.status === 'BOOKED').length;
    res.json({ summary: { venues: venues.length, bookings: bookings.length, upcomingBookings: confirmed.filter(item => item.slot?.startTime > new Date()).length, revenue: confirmed.reduce((sum, item) => sum + item.amount, 0), totalSlots: operational.length, bookedSlots: booked, occupancy: operational.length ? Math.round(booked / operational.length * 100) : 0, uniquePlayers: new Set(bookings.map(item => item.customer.toString())).size, cancellationRate: bookings.length ? Math.round(bookings.filter(item => item.status === 'CANCELLED').length / bookings.length * 100) : 0, averageBookingValue: confirmed.length ? Math.round(confirmed.reduce((sum, item) => sum + item.amount, 0) / confirmed.length) : 0 }, perVenue });
  } catch (e) { next(e); }
}

export async function cancelBooking(req, res, next) {
  const session = await mongoose.startSession();
  try {
    let booking;
    await session.withTransaction(async () => {
      booking = await Booking.findById(req.params.id).session(session); if (!booking) { const error = new Error('Booking not found'); error.statusCode = 404; throw error; }
      const permitted = req.user.role === 'admin' || booking.customer.equals(req.user._id) || (req.user.role === 'owner' && booking.owner.equals(req.user._id)); if (!permitted) { const error = new Error('You cannot modify this booking'); error.statusCode = 403; throw error; }
      if (booking.status !== 'CONFIRMED') { const error = new Error('Booking is not confirmed'); error.statusCode = 400; throw error; }
      booking.status = 'CANCELLED'; booking.paymentStatus = 'REFUNDED'; booking.cancelledAt = new Date(); booking.cancelledBy = req.user._id; booking.cancellationReason = req.body.reason || 'Not provided'; await booking.save({ session });
      await Slot.updateOne({ _id: booking.slot, status: 'BOOKED', startTime: { $gt: new Date() } }, { $set: { status: 'AVAILABLE' } }, { session });
      await writeAudit({ actor: req.user, venue: booking.venue, action: 'BOOKING_CANCELLED', entityType: 'Booking', entityId: booking._id, metadata: { reason: booking.cancellationReason }, session });
    });
    res.json({ booking });
  } catch (error) { next(error); } finally { await session.endSession(); }
}
