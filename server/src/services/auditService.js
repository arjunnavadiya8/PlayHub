import AuditLog from '../models/AuditLog.js';
export function writeAudit({ actor, venue, action, entityType, entityId, metadata = {}, session }) {
  return AuditLog.create([{ actor: actor._id, actorRole: actor.role, venue, action, entityType, entityId, metadata }], { session });
}
