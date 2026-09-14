import mongoose from 'mongoose';
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, actorRole: { type: String, required: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', index: true }, action: { type: String, required: true, index: true },
  entityType: { type: String, required: true }, entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });
auditLogSchema.index({ venue: 1, createdAt: -1 });
export default mongoose.model('AuditLog', auditLogSchema);
