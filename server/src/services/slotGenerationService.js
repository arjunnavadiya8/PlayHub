import Booking from '../models/Booking.js';
import Court from '../models/Court.js';
import Slot from '../models/Slot.js';

export const courtSportName = court => court.sportType === 'CUSTOM' ? court.customSportName : court.sportType[0] + court.sportType.slice(1).toLowerCase();
const atTime = (date, hhmm) => { const [hours, minutes] = hhmm.split(':').map(Number); const value = new Date(date); value.setHours(hours, minutes, 0, 0); return value; };

export async function generateCourtSlots(court, days = 30) {
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(from); to.setDate(to.getDate() + days);
  const desired = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(from); date.setDate(date.getDate() + offset);
    const rule = court.weeklySchedule.find(item => item.dayOfWeek === date.getDay());
    if (!rule?.enabled) continue;
    const close = atTime(date, rule.closeTime);
    for (let start = atTime(date, rule.openTime); start < close; start = new Date(start.getTime() + court.slotDurationMinutes * 60000)) {
      const end = new Date(start.getTime() + court.slotDurationMinutes * 60000); if (end > close) break;
      desired.push({ start, end });
    }
  }
  const desiredStarts = desired.map(item => item.start);
  await Slot.updateMany({ court: court._id, source: 'GENERATED', status: 'AVAILABLE', startTime: { $gte: from, $lt: to, $nin: desiredStarts } }, { $set: { status: 'BLOCKED', blockReason: 'OUTSIDE_SCHEDULE' } });
  const operations = desired.flatMap(item => [
    { updateOne: { filter: { court: court._id, startTime: item.start }, update: { $setOnInsert: { venue: court.venue, court: court._id, startTime: item.start, endTime: item.end, sport: courtSportName(court), price: court.defaultPrice, status: 'AVAILABLE', source: 'GENERATED' } }, upsert: true } },
    { updateOne: { filter: { court: court._id, startTime: item.start, status: 'BLOCKED', blockReason: 'OUTSIDE_SCHEDULE' }, update: { $set: { status: 'AVAILABLE', blockReason: null, endTime: item.end } } } }
  ]);
  if (operations.length) await Slot.bulkWrite(operations, { ordered: false });
  return { generatedThrough: to, slotCount: desired.length };
}

export async function releaseExpiredHolds() {
  const now = new Date();
  const held = await Slot.find({ status: 'HELD', holdExpiresAt: { $lte: now } }).select('_id');
  if (!held.length) return 0;
  const ids = held.map(slot => slot._id);
  await Slot.updateMany({ _id: { $in: ids }, status: 'HELD' }, { $set: { status: 'AVAILABLE' }, $unset: { heldBy: 1, holdExpiresAt: 1 } });
  await Booking.updateMany({ slot: { $in: ids }, status: 'PENDING_PAYMENT' }, { $set: { status: 'EXPIRED', paymentStatus: 'FAILED' } });
  return ids.length;
}

export async function refreshAllCourtSlots() {
  const courts = await Court.find({ active: true });
  for (const court of courts) await generateCourtSlots(court);
  return courts.length;
}
