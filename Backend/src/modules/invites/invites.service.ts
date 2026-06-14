import crypto from 'crypto';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '../../db/index.js';
import { invites, workspaceMembers, workspaces } from '../../db/schema.js';
import { ActivityService } from '../activity/activity.service.js';
import { logger } from '../../utils/logger.js';

type CreateInviteInput = {
  email: string;
  role: string;
};

type InviteEmailDelivery = {
  provider: 'resend';
  sent: boolean;
  message: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class InvitesService {
  static async list(workspaceId: string) {
    return db.select()
      .from(invites)
      .where(eq(invites.workspaceId, workspaceId))
      .orderBy(asc(invites.email));
  }

  static async create(workspaceId: string, invitedByUserId: string, input: CreateInviteInput) {
    const email = normalizeEmail(input.email);
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invite] = await db.insert(invites).values({
      workspaceId,
      email,
      invitedByUserId,
      role: input.role,
      token,
      expiresAt,
    }).returning();

    const inviteLink = `${process.env.APP_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;

    const resendApiKey = process.env.RESEND_API_KEY;
    let emailDelivery: InviteEmailDelivery = {
      provider: 'resend',
      sent: false,
      message: 'Invite link created. Configure RESEND_API_KEY to send email automatically.',
    };

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      try {
        await resend.emails.send({
          from: process.env.INVITE_FROM_EMAIL || 'Brackett <onboarding@resend.dev>',
          to: email,
          subject: 'You have been invited to join a Brackett workspace',
          html: `
            <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #18181b; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 650; letter-spacing: -0.02em;">You're invited to Brackett</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #3f3f46;">
                You've been invited to join a workspace on Brackett with the role of <strong>${input.role}</strong>.
              </p>
              <a href="${inviteLink}" style="background-color: #18181b; color: #ffffff; padding: 12px 18px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 650; font-size: 14px;">
                Accept Invitation
              </a>
              <p style="color: #71717a; font-size: 12px; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          `
        });
        emailDelivery = {
          provider: 'resend',
          sent: true,
          message: `Invite email sent to ${email}.`,
        };
      } catch (err) {
        logger.warn({ err, email }, 'Failed to send invite email via Resend');
        emailDelivery = {
          provider: 'resend',
          sent: false,
          message: 'Invite link created, but the email provider did not accept the message.',
        };
      }
    } else {
      logger.warn('RESEND_API_KEY not found. Invite email was not sent.');
    }

    const result = {
      ...invite,
      inviteLink,
      emailDelivery,
    };

    await ActivityService.record({
      workspaceId,
      category: 'invite',
      type: 'invite_created',
      title: 'Workspace invite created',
      summary: `An invite for ${email} was created with the ${input.role} role.`,
      targetType: 'invite',
      targetId: invite.id,
      createdByUserId: invitedByUserId,
    }).catch(() => undefined);

    return result;
  }

  static async revoke(workspaceId: string, inviteId: string) {
    const [invite] = await db.select()
      .from(invites)
      .where(and(eq(invites.id, inviteId), eq(invites.workspaceId, workspaceId)))
      .limit(1);

    if (!invite) {
      throw new Error('Invite not found');
    }

    await db.delete(invites).where(eq(invites.id, inviteId));

    await ActivityService.record({
      workspaceId,
      category: 'invite',
      type: 'invite_revoked',
      title: 'Workspace invite revoked',
      summary: `The pending invite for ${invite.email} was revoked.`,
      targetType: 'invite',
      targetId: invite.id,
    }).catch(() => undefined);

    return { success: true, inviteId };
  }

  static async accept(userId: string, userEmail: string, token: string) {
    const email = normalizeEmail(userEmail);

    const result = await db.transaction(async (tx) => {
      const [invite] = await tx.select()
        .from(invites)
        .where(and(
          eq(invites.token, token),
          gt(invites.expiresAt, new Date()),
          isNull(invites.acceptedAt)
        ))
        .limit(1);

      if (!invite) {
        throw new Error('Invite is invalid or expired');
      }

      if (normalizeEmail(invite.email) !== email) {
        throw new Error('This invite is for a different email address');
      }

      const [existingMembership] = await tx.select()
        .from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, invite.workspaceId),
          eq(workspaceMembers.userId, userId)
        ))
        .limit(1);

      if (!existingMembership) {
        await tx.insert(workspaceMembers).values({
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        });
      }

      await tx.update(invites)
        .set({ acceptedAt: new Date() })
        .where(eq(invites.id, invite.id));

      const [workspace] = await tx.select()
        .from(workspaces)
        .where(eq(workspaces.id, invite.workspaceId))
        .limit(1);

      return {
        workspace,
        role: existingMembership?.role || invite.role,
        inviteEmail: invite.email,
      };
    });

    await ActivityService.record({
      workspaceId: result.workspace.id,
      category: 'invite',
      type: 'invite_accepted',
      title: 'Workspace invite accepted',
      summary: `${result.inviteEmail} joined the workspace as ${result.role}.`,
      targetType: 'workspace',
      targetId: result.workspace.id,
      createdByUserId: userId,
    }).catch(() => undefined);

    return {
      workspace: result.workspace,
      role: result.role,
    };
  }
}
