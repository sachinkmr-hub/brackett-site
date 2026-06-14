import { Router } from 'express';
import { authenticate, requireWorkspaceContext } from '../../middlewares/auth.middleware.js';
import { MembersController } from './members.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireWorkspaceContext);

router.get('/', MembersController.list);
router.patch('/:membershipId/role', MembersController.updateRole);
router.delete('/:membershipId', MembersController.remove);

export default router;
