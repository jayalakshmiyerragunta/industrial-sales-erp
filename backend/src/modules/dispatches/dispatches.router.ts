import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { dispatchSchema } from './dispatches.schema';
import { list, getById, dispatchOrder } from './dispatches.controller';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/:id', getById);
router.post('/:id', requireRole('ADMIN'), validate(dispatchSchema), dispatchOrder);

export default router;