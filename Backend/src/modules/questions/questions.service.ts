import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { boards, discussionMessages, discussions } from '../../db/schema.js';
import { ActivityService } from '../activity/activity.service.js';

type CreateQuestionInput = {
  title?: string;
  longDescription?: string;
  boardId?: string;
  sourceType?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceExcerpt?: string;
  category?: string;
  priority?: string;
};

type ListQuestionFilters = {
  q?: string;
  status?: string;
  boardId?: string;
  priority?: string;
  category?: string;
  assigneeId?: string;
};

type DecisionInput = {
  decisionText?: string;
  sourceSummary?: string;
  sourceUrl?: string;
};

const toQuestion = (
  discussion: typeof discussions.$inferSelect,
  board: typeof boards.$inferSelect | null = null,
  latestDecision: DecisionInput | null = null
) => ({
  id: discussion.id,
  title: discussion.title,
  longDescription: discussion.description,
  sourceType: discussion.sourceType,
  sourceLabel: discussion.sourceLabel,
  sourceUrl: discussion.sourceUrl,
  sourceExcerpt: discussion.sourceExcerpt,
  category: discussion.category,
  priority: discussion.priority || 'medium',
  status: discussion.status,
  board: board
    ? {
        id: board.id,
        name: board.name,
        slug: board.slug,
        description: board.description,
        isArchived: board.isArchived,
      }
    : null,
  assignees: [],
  latestDecision: latestDecision
    ? {
        newValue: latestDecision,
      }
    : null,
  events: [],
  createdAt: discussion.createdAt.toISOString(),
  updatedAt: discussion.updatedAt.toISOString(),
});

export class QuestionsService {
  static async create(workspaceId: string, userId: string, data: CreateQuestionInput) {
    if (!data.title?.trim()) {
      throw new Error('Question title is required');
    }

    const [discussion] = await db.insert(discussions).values({
      workspaceId,
      boardId: data.boardId,
      createdByUserId: userId,
      title: data.title.trim(),
      description: data.longDescription?.trim() || data.sourceExcerpt?.trim() || null,
      sourceType: data.sourceType?.trim() || null,
      sourceUrl: data.sourceUrl?.trim() || null,
      sourceLabel: data.sourceLabel?.trim() || null,
      sourceExcerpt: data.sourceExcerpt?.trim() || null,
      category: data.category?.trim() || null,
      priority: data.priority?.trim() || 'medium',
      status: 'open',
    }).returning();

    await ActivityService.record({
      workspaceId,
      category: 'question',
      type: 'question_created',
      title: 'Question opened',
      summary: discussion.title,
      targetType: 'question',
      targetId: discussion.id,
      createdByUserId: userId,
      payload: {
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
        sourceLabel: data.sourceLabel,
        category: data.category,
        priority: data.priority,
      },
    }).catch(() => undefined);

    return toQuestion(discussion);
  }

  static async list(workspaceId: string, filters: ListQuestionFilters = {}) {
    const conditions = [eq(discussions.workspaceId, workspaceId)];

    if (filters.q?.trim()) {
      const search = `%${filters.q.trim()}%`;
      conditions.push(sql`(${discussions.title} ilike ${search} or coalesce(${discussions.description}, '') ilike ${search})`);
    }

    if (filters.status?.trim()) {
      conditions.push(eq(discussions.status, filters.status.trim()));
    }

    if (filters.boardId?.trim()) {
      conditions.push(eq(discussions.boardId, filters.boardId.trim()));
    }

    if (filters.priority?.trim()) {
      conditions.push(eq(discussions.priority, filters.priority.trim()));
    }

    if (filters.category?.trim()) {
      conditions.push(eq(discussions.category, filters.category.trim()));
    }

    const rows = await db.select({
      discussion: discussions,
      board: boards,
    })
      .from(discussions)
      .leftJoin(boards, eq(discussions.boardId, boards.id))
      .where(and(...conditions))
      .orderBy(desc(discussions.updatedAt));

    return rows.map((row) => toQuestion(row.discussion, row.board));
  }

  static async getById(workspaceId: string, questionId: string) {
    const [row] = await db.select({
      discussion: discussions,
      board: boards,
    })
      .from(discussions)
      .leftJoin(boards, eq(discussions.boardId, boards.id))
      .where(and(eq(discussions.workspaceId, workspaceId), eq(discussions.id, questionId)))
      .limit(1);

    if (!row) {
      return null;
    }

    const [latestMessage] = await db.select()
      .from(discussionMessages)
      .where(eq(discussionMessages.discussionId, questionId))
      .orderBy(desc(discussionMessages.createdAt))
      .limit(1);

    return toQuestion(
      row.discussion,
      row.board,
      latestMessage
        ? {
            decisionText: latestMessage.content,
          }
        : null
    );
  }

  static async updateStatus(workspaceId: string, questionId: string, userId: string, status: string) {
    const [discussion] = await db.update(discussions)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(discussions.workspaceId, workspaceId), eq(discussions.id, questionId)))
      .returning();

    if (!discussion) {
      throw new Error('Question not found');
    }

    await ActivityService.record({
      workspaceId,
      category: 'question',
      type: 'question_status_updated',
      title: 'Question status updated',
      summary: `${discussion.title} moved to ${status}.`,
      targetType: 'question',
      targetId: discussion.id,
      createdByUserId: userId,
      payload: { status },
    }).catch(() => undefined);

    return toQuestion(discussion);
  }

  static async logDecision(workspaceId: string, questionId: string, userId: string, data: DecisionInput) {
    if (!data.decisionText?.trim()) {
      throw new Error('Decision text is required');
    }

    const [discussion] = await db.update(discussions)
      .set({ status: 'answered', updatedAt: new Date() })
      .where(and(eq(discussions.workspaceId, workspaceId), eq(discussions.id, questionId)))
      .returning();

    if (!discussion) {
      throw new Error('Question not found');
    }

    const [message] = await db.insert(discussionMessages).values({
      discussionId: questionId,
      userId,
      content: data.decisionText.trim(),
    }).returning();

    await ActivityService.record({
      workspaceId,
      category: 'decision',
      type: 'decision_logged',
      title: 'Decision logged',
      summary: discussion.title,
      targetType: 'question',
      targetId: discussion.id,
      createdByUserId: userId,
      payload: {
        decisionText: data.decisionText,
        sourceSummary: data.sourceSummary,
        sourceUrl: data.sourceUrl,
      },
    }).catch(() => undefined);

    return {
      id: message.id,
      type: 'decision_logged',
      createdAt: message.createdAt.toISOString(),
      newValue: {
        decisionText: data.decisionText,
        sourceSummary: data.sourceSummary,
        sourceUrl: data.sourceUrl,
      },
    };
  }
}
