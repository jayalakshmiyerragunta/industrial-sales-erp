import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createEnquirySchema, setEnquiryStatusSchema } from './enquiries.schema';
import { list, getById, create, setStatus } from './enquiries.controller';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/:id', getById);
router.post('/', requireRole('ADMIN', 'SALES'), validate(createEnquirySchema), create);
router.patch('/:id/status', requireRole('ADMIN', 'SALES'), validate(setEnquiryStatusSchema), setStatus);

export default router;