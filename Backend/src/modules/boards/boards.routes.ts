import { Router } from 'express';
import { authenticate, requireWorkspaceContext } from '../../middlewares/auth.middleware.js';
import { BoardsController } from './boards.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireWorkspaceContext);

router.get('/', BoardsController.list);
router.post('/', BoardsController.create);
router.get('/:boardId', BoardsController.getById);
router.patch('/:boardId', BoardsController.update);

export default router;
