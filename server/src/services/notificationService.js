import Notification from '../models/Notification.js';
export const NotificationService = {
  bookingConfirmed({ ownerId, venueId, booking, court, session }) {
    return Notification.create([{ recipient: ownerId, venue: venueId, type: 'BOOKING_CONFIRMED', title: 'New booking received', message: `${court.name} was booked for ₹${booking.amount}`, entityType: 'Booking', entityId: booking._id }], { session });
  }
};
