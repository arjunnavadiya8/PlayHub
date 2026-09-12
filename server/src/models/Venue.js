import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  sports: [{ type: String, enum: ['Cricket', 'Football', 'Pickleball', 'Badminton', 'Tennis'] }],
  pricePerHour: { type: Number, required: true, min: 0 },
  image: String,
  rating: { type: Number, default: 4.5, min: 0, max: 5 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Venue', venueSchema);
