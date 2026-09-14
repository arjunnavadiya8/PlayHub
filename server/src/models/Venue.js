import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  sports: [{ type: String, enum: ['Cricket', 'Football', 'Pickleball', 'Badminton', 'Tennis'] }],
  pricePerHour: { type: Number, required: true, min: 0 },
  openingTime: { type: String, default: '06:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  closingTime: { type: String, default: '23:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  image: String,
  rating: { type: Number, default: 4.5, min: 0, max: 5 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

venueSchema.pre('validate', function () {
  if (this.openingTime && this.closingTime && this.openingTime >= this.closingTime) {
    this.invalidate('closingTime', 'Closing time must be later than opening time');
  }
});

export default mongoose.model('Venue', venueSchema);
