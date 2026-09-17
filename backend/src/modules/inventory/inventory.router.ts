import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { adjustInventorySchema } from './inventory.schema';
import { availability, adjust } from './inventory.controller';

const router = Router();
router.use(authenticate);

router.get('/', availability);
router.patch('/:productId', requireRole('ADMIN'), validate(adjustInventorySchema), adjust);

export default router;
