import { Router } from 'express';
import { authenticate, requireWorkspaceContext } from '../../middlewares/auth.middleware.js';
import { IntegrationsController } from './integrations.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireWorkspaceContext);

router.get('/catalog', IntegrationsController.catalog);
router.get('/', IntegrationsController.list);
router.post('/:provider', IntegrationsController.connect);

export default router;
