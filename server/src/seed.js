import 'dotenv/config';
import { connectDB } from './config/db.js';
import User from './models/User.js'; import Venue from './models/Venue.js'; import Slot from './models/Slot.js'; import Booking from './models/Booking.js';

await connectDB(); await Promise.all([Booking.deleteMany(), Slot.deleteMany(), Venue.deleteMany(), User.deleteMany()]);
const [owner, customer] = await User.create([{ name: 'Karan Desai', email: 'owner@playhub.in', phone: '9876543210', password: 'Owner@123', role: 'owner' }, { name: 'Rahul Mehta', email: 'player@playhub.in', phone: '9876501234', password: 'Player@123', role: 'customer' }]);
const venueData=[['Orbit Arena','Vesu, Surat',['Football','Cricket'],850,'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=84'],['The Pickle Yard','Piplod, Surat',['Pickleball'],650,'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=84'],['Box Cricket Co.','Adajan, Surat',['Cricket'],700,'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=84'],['Rally Sports Club','City Light, Surat',['Badminton','Pickleball'],550,'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=84']];
const venues=await Venue.create(venueData.map(([name,area,sports,pricePerHour,image])=>({owner,name,area,address:`${area}, Gujarat`,sports,pricePerHour,image,rating:4.7})));
const slots=[]; for(const venue of venues){ for(let day=0;day<7;day++){ for(const hour of [6,18,19,20,21]){const start=new Date();start.setDate(start.getDate()+day);start.setHours(hour,0,0,0);const end=new Date(start.getTime()+60*60*1000);slots.push({venue:venue._id,startTime:start,endTime:end,sport:venue.sports[0],price:venue.pricePerHour});}}} await Slot.insertMany(slots);
console.log(`Seeded ${venues.length} venues and ${slots.length} slots. Demo customer: ${customer.email}`); process.exit(0);
