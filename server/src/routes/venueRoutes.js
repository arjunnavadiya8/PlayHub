import { Router } from 'express';
import { createSlot, createVenue, getSlots, getVenue, listVenueAreas, listVenues, ownerSlots, ownerVenues, updateVenue } from '../controllers/venueController.js';
import { allow, protect } from '../middleware/auth.js';
const router = Router();
router.get('/', listVenues); router.get('/areas', listVenueAreas); router.get('/mine', protect, allow('owner'), ownerVenues); router.get('/:id', getVenue); router.get('/:id/slots', getSlots);
router.get('/:id/owner-slots', protect, allow('owner'), ownerSlots);
router.post('/', protect, allow('owner'), createVenue); router.patch('/:id', protect, allow('owner'), updateVenue); router.post('/:id/slots', protect, allow('owner'), createSlot);
export default router;
