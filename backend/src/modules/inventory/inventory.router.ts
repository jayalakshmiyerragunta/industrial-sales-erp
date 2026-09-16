import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { availability } from './inventory.controller';

const router = Router();
router.use(authenticate);

router.get('/', availability);

export default router;