import { db } from '../../db/index.js';
import { users, workspaceMembers } from '../../db/schema.js';
import { eq, asc, and } from 'drizzle-orm';
import { ActivityService } from '../activity/activity.service.js';

export class MembersService {
  static async list(workspaceId: string) {
    return db.select({
      membershipId: workspaceMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.createdAt,
    })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(asc(users.name));
  }

  static async updateRole(workspaceId: string, membershipId: string, updatedByUserId: string, newRole: string) {
    const [membership] = await db.update(workspaceMembers)
      .set({ role: newRole })
      .where(and(eq(workspaceMembers.id, membershipId), eq(workspaceMembers.workspaceId, workspaceId)))
      .returning();

    if (!membership) throw new Error('Membership not found');

    await ActivityService.record({
      workspaceId,
      category: 'team',
      type: 'member_role_updated',
      title: 'Member role updated',
      summary: `A team member's role was changed to ${newRole}.`,
      targetType: 'workspace_member',
      targetId: membershipId,
      createdByUserId: updatedByUserId,
    }).catch(() => undefined);

    return membership;
  }

  static async remove(workspaceId: string, membershipId: string, removedByUserId: string) {
    const [membership] = await db.select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.id, membershipId), eq(workspaceMembers.workspaceId, workspaceId)))
      .limit(1);

    if (!membership) throw new Error('Membership not found');

    await db.delete(workspaceMembers)
      .where(eq(workspaceMembers.id, membershipId));

    await ActivityService.record({
      workspaceId,
      category: 'team',
      type: 'member_removed',
      title: 'Member removed',
      summary: `A team member was removed from the workspace.`,
      targetType: 'workspace_member',
      targetId: membershipId,
      createdByUserId: removedByUserId,
    }).catch(() => undefined);

    return { success: true };
  }
}
