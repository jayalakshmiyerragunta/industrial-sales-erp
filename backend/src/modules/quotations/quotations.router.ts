import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createQuotationSchema, updateStatusSchema } from './quotations.schema';
import { list, getById, create, updateStatus } from './quotations.controller';
import { convertFromQuotation } from '../sales-orders/sales-orders.controller';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/:id', getById);
router.post('/', requireRole('ADMIN', 'SALES'), validate(createQuotationSchema), create);
router.patch('/:id/status', requireRole('ADMIN', 'SALES'), validate(updateStatusSchema), updateStatus);
router.post('/:id/convert', requireRole('ADMIN', 'SALES'), convertFromQuotation);

export default router;