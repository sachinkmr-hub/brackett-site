import { Router } from 'express';
import { authenticate, requireWorkspaceContext } from '../../middlewares/auth.middleware.js';
import { InvitesController } from './invites.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireWorkspaceContext);

router.get('/', InvitesController.list);
router.post('/', InvitesController.create);
router.delete('/:inviteId', InvitesController.revoke);

export default router;
