import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
  court: { type: mongoose.Schema.Types.ObjectId, ref: 'Court', required: true, index: true },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true, index: true },
  amount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING', index: true },
  status: { type: String, enum: ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'PAYMENT_FAILED', 'EXPIRED', 'REFUNDED'], default: 'PENDING_PAYMENT', index: true },
  bookingCode: { type: String, required: true, unique: true },
  expiresAt: Date,
  cancelledAt: Date,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String, trim: true, maxlength: 300 }
}, { timestamps: true });

bookingSchema.index({ venue: 1, status: 1, createdAt: -1 });
bookingSchema.index({ court: 1, createdAt: -1 });
export default mongoose.model('Booking', bookingSchema);
