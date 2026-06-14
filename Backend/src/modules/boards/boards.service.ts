import { and, asc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { boards } from '../../db/schema.js';
import { ActivityService } from '../activity/activity.service.js';

const makeSlug = (name: string) => {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return base || 'board';
};

export class BoardsService {
  static async list(workspaceId: string, filters: { q?: string; archived?: boolean } = {}) {
    const conditions = [eq(boards.workspaceId, workspaceId)];

    if (typeof filters.archived === 'boolean') {
      conditions.push(eq(boards.isArchived, filters.archived));
    }

    if (filters.q?.trim()) {
      const search = `%${filters.q.trim()}%`;
      conditions.push(sql`(${boards.name} ilike ${search} or coalesce(${boards.description}, '') ilike ${search})`);
    }

    return db.select()
      .from(boards)
      .where(and(...conditions))
      .orderBy(asc(boards.name));
  }

  static async getById(workspaceId: string, boardId: string) {
    const [board] = await db.select()
      .from(boards)
      .where(and(eq(boards.workspaceId, workspaceId), eq(boards.id, boardId)))
      .limit(1);

    return board || null;
  }

  static async create(workspaceId: string, data: { name: string; description?: string; isArchived?: boolean }) {
    const baseSlug = makeSlug(data.name);
    let nextSlug = baseSlug;
    let counter = 1;

    while (true) {
      const [existingBoard] = await db.select()
        .from(boards)
        .where(and(eq(boards.workspaceId, workspaceId), eq(boards.slug, nextSlug)))
        .limit(1);

      if (!existingBoard) break;
      counter += 1;
      nextSlug = `${baseSlug}-${counter}`;
    }

    const [board] = await db.insert(boards).values({
      workspaceId,
      name: data.name,
      slug: nextSlug,
      description: data.description,
      isArchived: data.isArchived ?? false,
    }).returning();

    await ActivityService.record({
      workspaceId,
      category: 'board',
      type: 'board_created',
      title: 'Board created',
      summary: `${board.name} is now available for workspace questions.`,
      targetType: 'board',
      targetId: board.id,
    }).catch(() => undefined);

    return board;
  }

  static async update(
    workspaceId: string,
    boardId: string,
    data: { name?: string; description?: string; isArchived?: boolean }
  ) {
    const existingBoard = await this.getById(workspaceId, boardId);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    let nextSlug = existingBoard.slug;
    if (data.name && data.name.trim() && data.name.trim() !== existingBoard.name) {
      const baseSlug = makeSlug(data.name);
      nextSlug = baseSlug;
      let counter = 1;

      while (true) {
        const [match] = await db.select()
          .from(boards)
          .where(and(
            eq(boards.workspaceId, workspaceId),
            eq(boards.slug, nextSlug)
          ))
          .limit(1);

        if (!match || match.id === boardId) break;
        counter += 1;
        nextSlug = `${baseSlug}-${counter}`;
      }
    }

    const [board] = await db.update(boards)
      .set({
        name: data.name ?? existingBoard.name,
        description: data.description ?? existingBoard.description,
        isArchived: data.isArchived ?? existingBoard.isArchived,
        slug: nextSlug,
        updatedAt: new Date(),
      })
      .where(and(eq(boards.workspaceId, workspaceId), eq(boards.id, boardId)))
      .returning();

    await ActivityService.record({
      workspaceId,
      category: 'board',
      type: data.isArchived === true
        ? 'board_archived'
        : data.isArchived === false && existingBoard.isArchived
          ? 'board_restored'
          : 'board_updated',
      title: data.isArchived === true
        ? 'Board archived'
        : data.isArchived === false && existingBoard.isArchived
          ? 'Board restored'
          : 'Board updated',
      summary: data.isArchived === true
        ? `${board.name} was archived.`
        : data.isArchived === false && existingBoard.isArchived
          ? `${board.name} was restored.`
          : `${board.name} was updated.`,
      targetType: 'board',
      targetId: board.id,
    }).catch(() => undefined);

    return board;
  }
}
