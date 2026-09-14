import { Router } from 'express';
import { allow, protect } from '../middleware/auth.js';
import { changeSlotState, createCourt, listCourts, listOwnerSlots, updateCourt, updateSchedule, venueBookings, venueCustomers, venueDashboard } from '../controllers/ownerController.js';
const router = Router(); router.use(protect, allow('owner', 'admin'));
router.get('/venues/:venueId/courts', listCourts); router.post('/venues/:venueId/courts', createCourt);
router.patch('/courts/:courtId', updateCourt); router.put('/courts/:courtId/schedule', updateSchedule);
router.get('/venues/:venueId/slots', listOwnerSlots); router.post('/slots/:slotId/:action', changeSlotState);
router.get('/venues/:venueId/dashboard', venueDashboard); router.get('/venues/:venueId/bookings', venueBookings); router.get('/venues/:venueId/customers', venueCustomers);
export default router;
