import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createProductSchema, updateProductSchema } from './products.schema';
import { list, getById, create, update, categories } from './products.controller';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.get('/categories', categories);
router.get('/:id', getById);
router.post('/', requireRole('ADMIN'), validate(createProductSchema), create);
router.patch('/:id', requireRole('ADMIN'), validate(updateProductSchema), update);

export default router;