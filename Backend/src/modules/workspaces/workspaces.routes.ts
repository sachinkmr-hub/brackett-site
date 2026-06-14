import { Router } from 'express';
import { WorkspacesController } from './workspaces.controller.js';
import { authenticate, requireWorkspaceContext } from '../../middlewares/auth.middleware.js';
import onboardingRoutes from '../onboarding/onboarding.routes.js';
import integrationsRoutes from '../integrations/integrations.routes.js';
import membersRoutes from '../members/members.routes.js';
import invitesRoutes from '../invites/invites.routes.js';
import { InvitesController } from '../invites/invites.controller.js';
import boardsRoutes from '../boards/boards.routes.js';
import { ActivityService } from '../activity/activity.service.js';
import { WorkspaceAnalyticsService } from './workspace-analytics.service.js';

// New Unified Startup OS routes
import discussionsRoutes from '../discussions/discussions.routes.js';
import questionsRoutes from '../questions/questions.routes.js';
import metricsRoutes from '../metrics/metrics.routes.js';
import privateAiRoutes from '../private_ai/private_ai.routes.js';

const router = Router();

router.use(authenticate);

router.get('/', WorkspacesController.listUserWorkspaces);
router.post('/invites/accept', InvitesController.accept);
router.get('/:workspaceId', requireWorkspaceContext, WorkspacesController.getWorkspace);

// Mount onboarding nested route
router.use('/:workspaceId/onboarding', onboardingRoutes);

// Mount integrations nested route
router.use('/:workspaceId/integrations', integrationsRoutes);

// Mount members nested route
router.use('/:workspaceId/members', membersRoutes);

// Mount invites nested route
router.use('/:workspaceId/invites', invitesRoutes);

// Mount boards nested route
router.use('/:workspaceId/boards', boardsRoutes);

// Pivot routes
router.get('/:workspaceId/analytics/overview', requireWorkspaceContext, async (req, res, next) => {
  try {
    const overview = await WorkspaceAnalyticsService.overview(req.workspaceId!, req.user.id);
    res.json(overview);
  } catch (error) {
    next(error);
  }
});
router.get('/:workspaceId/activity', requireWorkspaceContext, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 12);
    const sinceParam = Array.isArray(req.query.since) ? req.query.since[0] : req.query.since;
    const since = typeof sinceParam === 'string' && sinceParam.trim() ? new Date(sinceParam) : undefined;
    const activity = await ActivityService.list(req.workspaceId!, Number.isFinite(limit) ? limit : 12, since);
    res.json(activity);
  } catch (error) {
    next(error);
  }
});
router.use('/:workspaceId/questions', questionsRoutes);
router.use('/:workspaceId/discussions', discussionsRoutes);
router.use('/:workspaceId/metrics', metricsRoutes);
router.use('/:workspaceId/private_ai', privateAiRoutes);

export default router;
