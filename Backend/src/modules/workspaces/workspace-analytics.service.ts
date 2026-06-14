import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
  boards,
  discussionMessages,
  discussions,
  workspaceIntegrations,
} from '../../db/schema.js';

const OPEN_STATUSES = new Set(['open', 'active', 'in_progress']);
const ARCHIVED_STATUSES = new Set(['archived', 'closed', 'done']);

const differenceInDays = (from: Date, to: Date) => {
  const diff = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const hasSourceSignal = (discussion: typeof discussions.$inferSelect) =>
  Boolean(
    discussion.sourceUrl ||
    discussion.sourceLabel ||
    discussion.sourceExcerpt ||
    discussion.boardId
  );

export class WorkspaceAnalyticsService {
  static async overview(workspaceId: string, userId: string) {
    const [discussionRows, boardRows, integrationRows, latestDecisionRows] = await Promise.all([
      db.select().from(discussions).where(eq(discussions.workspaceId, workspaceId)).orderBy(desc(discussions.updatedAt)),
      db.select().from(boards).where(eq(boards.workspaceId, workspaceId)),
      db.select().from(workspaceIntegrations).where(eq(workspaceIntegrations.workspaceId, workspaceId)),
      db.select({
        discussionId: discussionMessages.discussionId,
        createdAt: discussionMessages.createdAt,
      })
        .from(discussionMessages)
        .innerJoin(discussions, eq(discussionMessages.discussionId, discussions.id))
        .where(eq(discussions.workspaceId, workspaceId))
        .orderBy(desc(discussionMessages.createdAt)),
    ]);

    const latestDecisionByDiscussion = new Set(latestDecisionRows.map((row) => row.discussionId));
    const openRows = discussionRows.filter((discussion) => OPEN_STATUSES.has(discussion.status));
    const now = new Date();
    const oldestOpen = openRows
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    const sourceBacked = discussionRows.filter((discussion) =>
      hasSourceSignal(discussion) || latestDecisionByDiscussion.has(discussion.id)
    ).length;
    const liveSources = integrationRows.filter((integration) =>
      ['ready', 'connected'].includes(integration.status)
    ).length;
    const highPriority = openRows.filter((discussion) =>
      ['high', 'critical'].includes(discussion.priority || '')
    ).length;
    const stale = openRows.filter((discussion) => differenceInDays(discussion.updatedAt, now) >= 7).length;

    return {
      total: discussionRows.length,
      open: discussionRows.filter((discussion) => ['open', 'active'].includes(discussion.status)).length,
      active: openRows.length,
      in_progress: discussionRows.filter((discussion) => discussion.status === 'in_progress').length,
      answered: discussionRows.filter((discussion) => discussion.status === 'answered').length,
      archived: discussionRows.filter((discussion) =>
        ARCHIVED_STATUSES.has(discussion.status)
      ).length,
      highPriority,
      stale,
      needsSource: openRows.filter((discussion) => !hasSourceSignal(discussion)).length,
      sourceBacked,
      sourceCoverage: discussionRows.length ? Math.round((sourceBacked / discussionRows.length) * 100) : 0,
      liveSources,
      totalBoards: boardRows.length,
      oldestOpenQuestion: oldestOpen
        ? {
            title: oldestOpen.title,
            ageDays: differenceInDays(oldestOpen.createdAt, now),
          }
        : null,
      assignedToMe: discussionRows
        .filter((discussion) =>
          discussion.createdByUserId === userId && OPEN_STATUSES.has(discussion.status)
        )
        .slice(0, 5)
        .map((discussion) => ({
          id: discussion.id,
          title: discussion.title,
          status: discussion.status,
          priority: discussion.priority,
        })),
    };
  }
}
