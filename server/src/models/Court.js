import mongoose from 'mongoose';

const dayScheduleSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  enabled: { type: Boolean, default: true },
  openTime: { type: String, default: '06:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  closeTime: { type: String, default: '23:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ }
}, { _id: false });

const courtSchema = new mongoose.Schema({
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  sportType: { type: String, enum: ['CRICKET', 'FOOTBALL', 'PICKLEBALL', 'BADMINTON', 'TENNIS', 'CUSTOM'], required: true, index: true },
  customSportName: { type: String, trim: true, maxlength: 50 },
  defaultPrice: { type: Number, required: true, min: 0 },
  slotDurationMinutes: { type: Number, enum: [30, 60, 90, 120], default: 60 },
  weeklySchedule: { type: [dayScheduleSchema], default: () => Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, enabled: true, openTime: '06:00', closeTime: '23:00' })) },
  active: { type: Boolean, default: true }
}, { timestamps: true });

courtSchema.index({ venue: 1, name: 1 }, { unique: true });
courtSchema.pre('validate', function () {
  if (this.sportType === 'CUSTOM' && !this.customSportName) this.invalidate('customSportName', 'Custom sport name is required');
  if (this.sportType !== 'CUSTOM') this.customSportName = undefined;
});
export default mongoose.model('Court', courtSchema);
