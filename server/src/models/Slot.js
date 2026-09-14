import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
  court: { type: mongoose.Schema.Types.ObjectId, ref: 'Court', required: true, index: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  sport: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED', 'MAINTENANCE', 'EXPIRED'], default: 'AVAILABLE', index: true },
  heldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  holdExpiresAt: { type: Date, index: true },
  source: { type: String, enum: ['GENERATED', 'MANUAL'], default: 'GENERATED' },
  blockReason: { type: String, trim: true, maxlength: 200 }
}, { timestamps: true });

slotSchema.index({ court: 1, startTime: 1 }, { unique: true });
slotSchema.index({ venue: 1, startTime: 1, status: 1 });
export default mongoose.model('Slot', slotSchema);
