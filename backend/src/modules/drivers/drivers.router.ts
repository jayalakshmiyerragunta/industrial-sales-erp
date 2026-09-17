import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { list } from './drivers.controller';

const router = Router();
router.use(authenticate);

router.get('/', list);

export default router;