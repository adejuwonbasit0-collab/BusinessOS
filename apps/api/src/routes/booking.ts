import { Router } from 'express';
import { BookingController } from '../controllers/BookingController';
import { authenticate, authorize } from '../middleware/authenticate';
import { rateLimiter } from '../middleware';
import { requireFields } from '../lib/validation';

const router = Router();
const ctrl = new BookingController();
router.use(authenticate, rateLimiter);

router.get('/resources', ctrl.listResources);
router.post('/resources', authorize('super_admin', 'owner', 'admin', 'manager'), requireFields('name'), ctrl.createResource);
router.get('/', ctrl.listBookings);
router.post('/', requireFields('title', 'startAt', 'endAt'), ctrl.createBooking);
router.patch('/:id/status', ctrl.updateBookingStatus);
router.post('/:id/cancel', ctrl.cancelBooking);
router.get('/availability', ctrl.checkAvailability);
router.get('/stats', ctrl.stats);

export default router;
