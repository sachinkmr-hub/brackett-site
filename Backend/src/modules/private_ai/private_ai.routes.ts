import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { boards, discussions, onboardingProfiles, workspaceIntegrations } from '../../db/schema.js';
import { buildAnalystBrief } from './analyst.js';
import { requireWorkspaceContext } from '../../middlewares/auth.middleware.js';

const router = Router({ mergeParams: true });

const askSchema = z.object({
  query: z.string().trim().min(3).max(600),
});

router.use(requireWorkspaceContext);

router.get('/', async (req, res, next) => {
  try {
    const [profile] = await db.select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.workspaceId, req.workspaceId!))
      .limit(1);

    const integrations = await db.select()
      .from(workspaceIntegrations)
      .where(eq(workspaceIntegrations.workspaceId, req.workspaceId!));

    res.json({
      status: integrations.some((integration) => ['ready', 'connected'].includes(integration.status))
        ? 'ready'
        : 'needs_source',
      workspaceProfileReady: Boolean(profile),
      liveSources: integrations.filter((integration) => ['ready', 'connected'].includes(integration.status)).length,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'BAD_REQUEST',
        message: parsed.error.issues[0]?.message || 'A question is required.',
      });
    }

    const { query } = parsed.data;

    const [profile] = await db.select()
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.workspaceId, req.workspaceId!))
      .limit(1);

    const [discussionRows, boardRows, integrations] = await Promise.all([
      db.select({
        discussion: discussions,
        board: boards,
      })
        .from(discussions)
        .leftJoin(boards, and(eq(discussions.boardId, boards.id), eq(boards.workspaceId, req.workspaceId!)))
        .where(eq(discussions.workspaceId, req.workspaceId!))
        .orderBy(desc(discussions.updatedAt)),
      db.select().from(boards).where(eq(boards.workspaceId, req.workspaceId!)),
      db.select().from(workspaceIntegrations).where(eq(workspaceIntegrations.workspaceId, req.workspaceId!)),
    ]);

    const liveSources = integrations.filter((integration) => ['ready', 'connected'].includes(integration.status));
    const brief = buildAnalystBrief(query, discussionRows.map(({ discussion, board }) => ({
      ...discussion, board: board?.name || null,
    })), liveSources.length);

    res.json({
      ...brief,
      profile: profile
        ? {
            businessName: profile.businessName,
            industry: profile.industry,
            targetCustomer: profile.targetCustomer,
          }
        : null,
      summary: { ...brief.summary, boards: boardRows.length },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
