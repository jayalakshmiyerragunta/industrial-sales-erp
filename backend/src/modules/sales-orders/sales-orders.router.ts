import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { list, getById, confirm, cancel } from './sales-orders.controller';
import { dispatchOrder } from '../dispatches/dispatches.controller';
import { dispatchSchema } from '../dispatches/dispatches.schema';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/:id', getById);
router.post('/:id/confirm', requireRole('ADMIN'), confirm);
router.post('/:id/cancel', requireRole('ADMIN'), cancel);
// Alias of POST /dispatches/:id — matches the API shape in the assignment brief.
router.post('/:id/dispatch', requireRole('ADMIN'), validate(dispatchSchema), dispatchOrder);

export default router;