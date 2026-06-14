import { Router } from 'express';
import { authenticate, requireWorkspaceContext } from '../../middlewares/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireWorkspaceContext);

router.get('/', (req, res) => {
  res.json([]);
});

router.post('/', (req, res) => {
  res.json({ success: true });
});

export default router;
