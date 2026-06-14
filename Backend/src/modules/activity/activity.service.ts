import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users, workspaceActivityEvents } from '../../db/schema.js';

type ActivityRecordInput = {
  workspaceId: string;
  category: string;
  type: string;
  title: string;
  summary?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  payload?: Record<string, unknown> | null;
  createdByUserId?: string | null;
};

export class ActivityService {
  static async record(params: ActivityRecordInput) {
    const [event] = await db.insert(workspaceActivityEvents).values({
      workspaceId: params.workspaceId,
      category: params.category,
      type: params.type,
      title: params.title,
      summary: params.summary,
      targetType: params.targetType,
      targetId: params.targetId,
      payload: params.payload,
      createdByUserId: params.createdByUserId,
    }).returning();

    return event;
  }

  static async list(workspaceId: string, limit = 12, since?: Date) {
    const cappedLimit = Math.min(Math.max(limit, 1), 50);
    const conditions = [eq(workspaceActivityEvents.workspaceId, workspaceId)];

    if (since && !Number.isNaN(since.getTime())) {
      conditions.push(gt(workspaceActivityEvents.createdAt, since));
    }

    const rows = await db.select({
      id: workspaceActivityEvents.id,
      type: workspaceActivityEvents.type,
      category: workspaceActivityEvents.category,
      title: workspaceActivityEvents.title,
      summary: workspaceActivityEvents.summary,
      createdAt: workspaceActivityEvents.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
      .from(workspaceActivityEvents)
      .leftJoin(users, eq(workspaceActivityEvents.createdByUserId, users.id))
      .where(and(...conditions))
      .orderBy(desc(workspaceActivityEvents.createdAt))
      .limit(cappedLimit);

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      category: row.category,
      title: row.title,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
      actor: row.actorName || row.actorEmail
        ? { name: row.actorName ?? undefined, email: row.actorEmail ?? undefined }
        : null,
    }));
  }
}
