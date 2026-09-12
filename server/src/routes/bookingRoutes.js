import { Router } from 'express';
import { cancelBooking, createBooking, myBookings, ownerBookings } from '../controllers/bookingController.js';
import { allow, protect } from '../middleware/auth.js';
const router = Router();
router.use(protect); router.post('/', allow('customer'), createBooking); router.get('/mine', allow('customer'), myBookings); router.get('/owner', allow('owner'), ownerBookings); router.patch('/:id/cancel', cancelBooking);
export default router;
