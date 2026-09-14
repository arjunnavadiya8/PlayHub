import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import AuditLog from './models/AuditLog.js'; import Booking from './models/Booking.js'; import Court from './models/Court.js'; import Notification from './models/Notification.js'; import Slot from './models/Slot.js'; import User from './models/User.js'; import Venue from './models/Venue.js';
import { generateCourtSlots } from './services/slotGenerationService.js';

await connectDB();
await Promise.all([AuditLog.deleteMany(), Notification.deleteMany(), Booking.deleteMany(), Slot.deleteMany(), Court.deleteMany(), Venue.deleteMany(), User.deleteMany()]);
const [owner, customer, admin] = await User.create([
  { name: 'Karan Desai', email: 'owner@playhub.in', phone: '9876543210', password: 'Owner@123', role: 'owner' },
  { name: 'Rahul Mehta', email: 'player@playhub.in', phone: '9876501234', password: 'Player@123', role: 'customer' },
  { name: 'PlayHub Admin', email: 'admin@playhub.in', phone: '9876500000', password: 'Admin@123', role: 'admin' }
]);
const venueData = [
  ['Orbit Arena', 'Vesu, Surat', 850, 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=84'],
  ['The Pickle Yard', 'Piplod, Surat', 650, 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=84'],
  ['Box Cricket Co.', 'Adajan, Surat', 700, 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=84'],
  ['Rally Sports Club', 'City Light, Surat', 550, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=84']
];
const venues = await Venue.create(venueData.map(([name, area, pricePerHour, image]) => ({ owner, name, area, address: `${area}, Gujarat`, sports: [], pricePerHour, image, rating: 4.7 })));
const courtSpecs = [
  [0, 'Football Turf', 'FOOTBALL', 850], [0, 'Cricket Turf 1', 'CRICKET', 900],
  [1, 'Pickleball Court 1', 'PICKLEBALL', 650],
  [2, 'Cricket Turf 1', 'CRICKET', 700], [2, 'Cricket Turf 2', 'CRICKET', 750],
  [3, 'Badminton Court 1', 'BADMINTON', 550], [3, 'Pickleball Court 1', 'PICKLEBALL', 600]
];
const courts = await Court.create(courtSpecs.map(([venueIndex, name, sportType, defaultPrice]) => ({ venue: venues[venueIndex]._id, name, sportType, defaultPrice, slotDurationMinutes: 60 })));
for (const court of courts) await generateCourtSlots(court);
for (const venue of venues) {
  const venueCourts = courts.filter(court => court.venue.equals(venue._id));
  venue.sports = [...new Set(venueCourts.map(court => court.sportType[0] + court.sportType.slice(1).toLowerCase()))]; await venue.save();
}
const demoSlot = await Slot.findOne({ court: courts[0]._id, startTime: { $gt: new Date() }, status: 'AVAILABLE' }).sort({ startTime: 1 });
if (demoSlot) { demoSlot.status = 'BOOKED'; await demoSlot.save(); await Booking.create({ customer, owner, venue: venues[0]._id, court: courts[0]._id, slot: demoSlot._id, amount: demoSlot.price, paymentStatus: 'PAID', status: 'CONFIRMED', bookingCode: 'PHDEMO001' }); }
console.log(`Seeded ${venues.length} venues, ${courts.length} courts and ${await Slot.countDocuments()} slots. Admin: ${admin.email}`);
await mongoose.disconnect(); process.exit(0);
