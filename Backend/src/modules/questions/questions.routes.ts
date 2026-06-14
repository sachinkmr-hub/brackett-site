import { Router } from 'express';
import { authenticate, requireWorkspaceContext } from '../../middlewares/auth.middleware.js';
import { QuestionsController } from './questions.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireWorkspaceContext);

router.get('/', QuestionsController.list);
router.post('/', QuestionsController.create);
router.get('/:questionId', QuestionsController.getById);
router.patch('/:questionId/status', QuestionsController.updateStatus);
router.post('/:questionId/decision', QuestionsController.logDecision);

export default router;
