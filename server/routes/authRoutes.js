import express from 'express';
import {
    register,
    login,
    logout,
    refresh,
    me,
    discordStart,
    discordCallback
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, registerBody, loginBody } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', authLimiter, validate({ body: registerBody }), register);
router.post('/login', authLimiter, validate({ body: loginBody }), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.get('/discord', authLimiter, discordStart);
router.get('/discord/callback', discordCallback);

export default router;
