import 'dotenv/config';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Booking from '../src/models/Booking.js';
import User from '../src/models/User.js';

const api = process.env.TEST_API_URL || 'http://localhost:5000/api';
const email = `group-booking-${Date.now()}@playhub.local`;
const heldBookings = [];
let customerId;

const request = async (path, options = {}) => {
  const response = await fetch(`${api}${path}`, { ...options, headers: { 'content-type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

try {
  const registration = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Group Booking Test', email, password: 'GroupTest123', role: 'customer' }) });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.body));
  customerId = registration.body.user.id;
  const authorization = `Bearer ${registration.body.token}`;

  const venueResponse = await request('/venues');
  const venue = venueResponse.body.venues?.[0];
  assert.ok(venue, 'A venue is required for the group-booking test');
  const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const slotResponse = await request(`/venues/${venue._id}/slots?date=${date.toISOString().slice(0, 10)}`);
  const futureSlots = slotResponse.body.slots.filter(slot => new Date(slot.startTime) > new Date());
  const groups = futureSlots.reduce((map, slot) => {
    const key = `${slot.sport}|${slot.startTime}`;
    map.set(key, [...(map.get(key) || []), slot]); return map;
  }, new Map());
  const candidate = [...groups.values()].find(group => group.length >= 2);
  assert.ok(candidate, 'At least two same-sport courts with the same future start time are required');
  const payload = { venueId: venue._id, sport: candidate[0].sport, startTime: candidate[0].startTime };

  for (let index = 0; index < candidate.length; index += 1) {
    const held = await request('/bookings/hold', { method: 'POST', headers: { authorization }, body: JSON.stringify(payload) });
    assert.equal(held.response.status, 201, JSON.stringify(held.body));
    heldBookings.push(held.body.booking);
  }
  assert.equal(new Set(heldBookings.map(booking => booking.court)).size, candidate.length, 'Each hold must receive a different court');

  const exhausted = await request('/bookings/hold', { method: 'POST', headers: { authorization }, body: JSON.stringify(payload) });
  assert.equal(exhausted.response.status, 409, 'The shared time should close only after every matching court is held');
  console.log(`GROUP_BOOKING_OK sport=${payload.sport} time=${payload.startTime} capacity=${candidate.length} distinctCourts=${new Set(heldBookings.map(booking => booking.court)).size}`);

  for (const booking of heldBookings) {
    const released = await request(`/bookings/${booking._id}/payment-failed`, { method: 'POST', headers: { authorization }, body: '{}' });
    assert.equal(released.response.status, 200, JSON.stringify(released.body));
  }
} finally {
  await mongoose.connect('mongodb://127.0.0.1:27018/playhub?directConnection=true');
  if (customerId) await Booking.deleteMany({ customer: customerId });
  await User.deleteOne({ email });
  await mongoose.disconnect();
}
