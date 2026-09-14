import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Booking from './models/Booking.js';
import Court from './models/Court.js';
import Slot from './models/Slot.js';
import Venue from './models/Venue.js';

await connectDB();
const venues = await Venue.find(); let courtsCreated = 0; let slotsMigrated = 0; let bookingsMigrated = 0;
for (const venue of venues) {
  const types = venue.sports?.length ? venue.sports : ['Cricket'];
  const courts = new Map();
  for (const sport of types) {
    const sportType = ['Cricket', 'Football', 'Pickleball', 'Badminton', 'Tennis'].includes(sport) ? sport.toUpperCase() : 'CUSTOM';
    const name = `${sport} ${sport === 'Pickleball' || sport === 'Badminton' || sport === 'Tennis' ? 'Court' : 'Turf'} 1`;
    let court = await Court.findOne({ venue: venue._id, name });
    if (!court) { court = await Court.create({ venue: venue._id, name, sportType, customSportName: sportType === 'CUSTOM' ? sport : undefined, defaultPrice: venue.pricePerHour, slotDurationMinutes: 60 }); courtsCreated += 1; }
    courts.set(sport.toLowerCase(), court);
  }
  const legacySlots = await Slot.collection.find({ venue: venue._id, $or: [{ court: { $exists: false } }, { court: null }] }).toArray();
  for (const slot of legacySlots) {
    const court = courts.get(String(slot.sport || types[0]).toLowerCase()) || [...courts.values()][0];
    await Slot.collection.updateOne({ _id: slot._id }, { $set: { court: court._id, status: slot.isBooked ? 'BOOKED' : 'AVAILABLE', source: 'GENERATED' }, $unset: { isBooked: '' } }); slotsMigrated += 1;
  }
}
const legacyBookings = await Booking.collection.find({ $or: [{ court: { $exists: false } }, { court: null }] }).toArray();
for (const booking of legacyBookings) {
  const slot = await Slot.collection.findOne({ _id: booking.slot }); if (!slot?.court) continue;
  const statusMap = { confirmed: 'CONFIRMED', cancelled: 'CANCELLED', completed: 'CONFIRMED', pending: 'PENDING_PAYMENT' };
  const paymentMap = { paid: 'PAID', pending: 'PENDING', failed: 'FAILED', refunded: 'REFUNDED' };
  await Booking.collection.updateOne({ _id: booking._id }, { $set: { court: slot.court, status: statusMap[booking.status] || booking.status || 'CONFIRMED', paymentStatus: paymentMap[booking.paymentStatus] || booking.paymentStatus || 'PAID' } }); bookingsMigrated += 1;
}
try { await Slot.collection.dropIndex('venue_1_startTime_1'); } catch (error) { if (error.codeName !== 'IndexNotFound') console.warn(error.message); }
try { await Booking.collection.dropIndex('slot_1'); } catch (error) { if (error.codeName !== 'IndexNotFound') console.warn(error.message); }
await Promise.all([Court.syncIndexes(), Slot.syncIndexes(), Booking.syncIndexes()]);
console.log(JSON.stringify({ venues: venues.length, courtsCreated, slotsMigrated, bookingsMigrated }));
await mongoose.disconnect(); process.exit(0);
