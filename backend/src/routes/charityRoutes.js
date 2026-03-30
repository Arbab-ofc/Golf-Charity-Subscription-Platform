import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  createCharity,
  deleteCharity,
  getAllCharities,
  getCharityById,
  getCharityContributions,
  getUserCharity,
  setFeaturedCharity,
  setUserCharity,
  updateCharity,
} from '../services/charityService.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const featured = req.query.featured === 'true';
  const search = String(req.query.search || '');
  const data = await getAllCharities({ page, featured, search });
  res.status(200).json(data);
}));

router.get('/featured', asyncHandler(async (_req, res) => {
  const data = await getAllCharities({ featured: true });
  res.status(200).json({ charities: data.charities });
}));

router.get('/my-charity', requireAuth, asyncHandler(async (req, res) => {
  const data = await getUserCharity(req.user.id);
  res.status(200).json(data);
}));

router.post('/my-charity', requireAuth, asyncHandler(async (req, res) => {
  const { charityId, percentage } = req.body;
  const data = await setUserCharity(req.user.id, charityId, percentage);
  res.status(200).json({ ...data, message: 'My charity updated' });
}));

router.get('/:charityId', asyncHandler(async (req, res) => {
  const data = await getCharityById(req.params.charityId);
  res.status(200).json(data);
}));

router.get('/:charityId/contributions', asyncHandler(async (req, res) => {
  const data = await getCharityContributions(req.params.charityId);
  res.status(200).json(data);
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const charity = await createCharity(req.body);
  res.status(201).json({ charity, message: 'Charity created' });
}));

router.patch('/:charityId', requireAdmin, asyncHandler(async (req, res) => {
  const charity = await updateCharity(req.params.charityId, req.body);
  res.status(200).json({ charity, message: 'Charity updated' });
}));

router.patch('/:charityId/featured', requireAdmin, asyncHandler(async (req, res) => {
  const charity = await setFeaturedCharity(req.params.charityId, Boolean(req.body.featured));
  res.status(200).json({ charity, message: 'Featured state updated' });
}));

router.delete('/:charityId', requireAdmin, asyncHandler(async (req, res) => {
  const data = await deleteCharity(req.params.charityId);
  res.status(200).json(data);
}));

export default router;
