import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { boards, discussions, onboardingProfiles, workspaceIntegrations } from '../../db/schema.js';
import { requireWorkspaceContext } from '../../middlewares/auth.middleware.js';

const router = Router({ mergeParams: true });

const askSchema = z.object({
  query: z.string().trim().min(3).max(600),
});

const openStatuses = new Set(['open', 'active', 'in_progress']);

const tokenize = (query: string) =>
  query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

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
    const terms = tokenize(query);

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
        .leftJoin(boards, eq(discussions.boardId, boards.id))
        .where(eq(discussions.workspaceId, req.workspaceId!))
        .orderBy(desc(discussions.updatedAt)),
      db.select().from(boards).where(eq(boards.workspaceId, req.workspaceId!)),
      db.select().from(workspaceIntegrations).where(eq(workspaceIntegrations.workspaceId, req.workspaceId!)),
    ]);

    const liveSources = integrations.filter((integration) => ['ready', 'connected'].includes(integration.status));
    const activeDiscussions = discussionRows.filter((row) => openStatuses.has(row.discussion.status));
    const highPriority = activeDiscussions.filter((row) => ['high', 'critical'].includes(row.discussion.priority || ''));
    const sourceGaps = activeDiscussions.filter((row) =>
      !row.discussion.sourceUrl &&
      !row.discussion.sourceLabel &&
      !row.discussion.sourceExcerpt &&
      !row.discussion.boardId
    );
    const matches = discussionRows
      .filter((row) => {
        if (!terms.length) return true;
        const haystack = [
          row.discussion.title,
          row.discussion.description,
          row.discussion.sourceLabel,
          row.discussion.category,
          row.board?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        return terms.some((term) => haystack.includes(term));
      })
      .slice(0, 5);

    const answer = liveSources.length
      ? [
          `I found ${activeDiscussions.length} open decision loop${activeDiscussions.length === 1 ? '' : 's'} and ${liveSources.length} live source${liveSources.length === 1 ? '' : 's'}.`,
          highPriority.length
            ? `${highPriority.length} open item${highPriority.length === 1 ? '' : 's'} should be reviewed first because the priority is high or critical.`
            : 'No open item is currently marked high or critical.',
          sourceGaps.length
            ? `${sourceGaps.length} open item${sourceGaps.length === 1 ? '' : 's'} still need a source trail before the answer should be treated as final.`
            : 'The open items have enough source scaffolding for an MVP review.',
        ].join(' ')
      : [
          'I can summarize workspace state, but I will not present this as a sourced analyst answer yet.',
          'Connect a live source first so Brackett can attach confidence to the response.',
        ].join(' ');

    res.json({
      query,
      answer,
      confidence: liveSources.length ? 'workspace_grounded' : 'needs_live_source',
      profile: profile
        ? {
            businessName: profile.businessName,
            industry: profile.industry,
            targetCustomer: profile.targetCustomer,
          }
        : null,
      summary: {
        openLoops: activeDiscussions.length,
        highPriority: highPriority.length,
        sourceGaps: sourceGaps.length,
        liveSources: liveSources.length,
        boards: boardRows.length,
      },
      sources: matches.map((row) => ({
        id: row.discussion.id,
        title: row.discussion.title,
        status: row.discussion.status,
        priority: row.discussion.priority,
        board: row.board?.name || null,
        sourceUrl: row.discussion.sourceUrl,
        sourceLabel: row.discussion.sourceLabel,
      })),
      nextActions: [
        sourceGaps.length ? 'Attach source trails to open items with missing context.' : null,
        highPriority.length ? 'Review high-priority decisions before creating new boards.' : null,
        !profile ? 'Complete the workspace profile so answers have product context.' : null,
        !liveSources.length ? 'Connect at least one live source before relying on analyst answers.' : null,
      ].filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
