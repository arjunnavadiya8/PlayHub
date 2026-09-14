import { Router } from 'express';
import { cancelBooking, confirmBooking, failPayment, holdSlot, myBookings, ownerAnalytics, ownerBookings } from '../controllers/bookingController.js';
import { allow, protect } from '../middleware/auth.js';
const router = Router();
router.use(protect); router.post('/hold', allow('customer'), holdSlot); router.post('/:id/confirm', allow('customer'), confirmBooking); router.post('/:id/payment-failed', allow('customer'), failPayment); router.get('/mine', allow('customer'), myBookings); router.get('/owner', allow('owner', 'admin'), ownerBookings); router.get('/owner/analytics', allow('owner', 'admin'), ownerAnalytics); router.patch('/:id/cancel', cancelBooking);
export default router;
