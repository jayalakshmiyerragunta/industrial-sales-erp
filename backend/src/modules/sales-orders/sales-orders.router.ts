import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { list, getById, confirm, cancel } from './sales-orders.controller';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/:id', getById);
router.post('/:id/confirm', requireRole('ADMIN'), confirm);
router.post('/:id/cancel', requireRole('ADMIN'), cancel);

export default router;