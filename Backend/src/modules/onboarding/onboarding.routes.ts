import { Router } from 'express';
import { OnboardingController } from './onboarding.controller.js';
import { authenticate, requireWorkspaceContext } from '../../middlewares/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(authenticate, requireWorkspaceContext);

router.get('/', OnboardingController.getProfile);
router.post('/website', OnboardingController.onboardFromWebsite);
router.post('/scratch', OnboardingController.onboardFromScratch);

export default router;
