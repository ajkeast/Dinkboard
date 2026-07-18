import express from 'express';
import { z } from 'zod';
import {
    listUsers,
    updateUserRole,
    deleteUser
} from '../controllers/userAdminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate, numericId } from '../middleware/validate.js';

const router = express.Router();

const roleBody = z.object({
    role: z.enum(['admin', 'viewer'])
});

router.use(requireAuth, requireAdmin);

router.get('/', listUsers);
router.patch(
    '/:id/role',
    validate({ params: z.object({ id: numericId }), body: roleBody }),
    updateUserRole
);
router.delete(
    '/:id',
    validate({ params: z.object({ id: numericId }) }),
    deleteUser
);

export default router;
