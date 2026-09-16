import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { list } from './users.controller';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN'), list);

export default router;