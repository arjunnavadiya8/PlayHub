import { Router } from 'express';
import { login, loginOwner, me, register, registerOwner } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
const router = Router();
router.post('/register', register); router.post('/login', login);
router.post('/owner/register', registerOwner); router.post('/owner/login', loginOwner);
router.get('/me', protect, me);
export default router;
