import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  signupUser,
  loginUser,
  refreshToken,
  getCurrentUser,
  logoutUser,
  sendPasswordReset,
} from '../services/authService.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: 'Too many login attempts. Try again later.' },
});

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { email, password, fullName, charityId, charityPercentage } = req.body;
    const result = await signupUser(email, password, fullName, charityId, charityPercentage);
    res.status(201).json({ ...result, message: 'User created successfully' });
  })
);

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    res.status(200).json({ ...result, message: 'Login successful' });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;
    const newToken = await refreshToken(token);
    res.status(200).json({ token: newToken });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await getCurrentUser(req.user.id);
    res.status(200).json(result);
  })
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await logoutUser(req.user.id);
    res.status(200).json(result);
  })
);

router.post(
  '/password-reset',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await sendPasswordReset(email);
    res.status(200).json(result);
  })
);

export default router;
