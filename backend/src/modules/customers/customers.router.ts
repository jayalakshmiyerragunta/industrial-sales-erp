import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from './customers.schema';
import { list, getById, create, update } from './customers.controller';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/:id', getById);
router.post('/', requireRole('ADMIN', 'SALES'), validate(createCustomerSchema), create);
router.patch('/:id', requireRole('ADMIN', 'SALES'), validate(updateCustomerSchema), update);

export default router;