import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  sport: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  isBooked: { type: Boolean, default: false, index: true }
}, { timestamps: true });
slotSchema.index({ venue: 1, startTime: 1 }, { unique: true });

export default mongoose.model('Slot', slotSchema);
