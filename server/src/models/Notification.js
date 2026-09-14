import mongoose from 'mongoose';
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', index: true },
  type: { type: String, required: true }, title: { type: String, required: true }, message: { type: String, required: true },
  entityType: String, entityId: mongoose.Schema.Types.ObjectId, readAt: Date
}, { timestamps: true });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);
