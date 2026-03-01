import clerkAuth from '../middleware/clerk-auth.js';
import prisma from '../config/db.js';
import { sendDailyDigest } from '../services/resend.js';
import { clerkClient } from '@clerk/fastify';

/**
 * Email route plugin.
 *
 * - POST /email/daily-digest — generate and send the daily digest for the authenticated user
 * - POST /email/test         — send a test email to the authenticated user
 *
 * All routes require Clerk JWT authentication.
 */
export default async function emailRoutes(fastify) {
  // ── POST /email/daily-digest ──────────────────────────────────────────
  fastify.post(
    '/daily-digest',
    { preHandler: [clerkAuth] },
    async (request, reply) => {
      try {
        // Look up the user's email from Clerk
        const user = await clerkClient.users.getUser(request.userId);
        const email = user.emailAddresses[0]?.emailAddress;

        if (!email) {
          request.log.error('User email not found for daily digest');
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User email not found',
          });
        }

        // Gather today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [habitsCompleted, habitsTotal, tasksCompleted, tasksTotal, journalEntries] = await Promise.all([
          prisma.habit.count({
            where: { user_id: request.userId, is_active: true, last_completed_at: { gte: today } }
          }),
          prisma.habit.count({
            where: { user_id: request.userId, is_active: true }
          }),
          prisma.task.count({
            where: { user_id: request.userId, is_archived: false, status: 'completed', completion_date: { gte: today } }
          }),
          prisma.task.count({
            where: { user_id: request.userId, is_archived: false }
          }),
          prisma.journal.count({
            where: { user_id: request.userId, created_at: { gte: today } }
          }),
        ]);

        const stats = {
          habitsCompleted,
          habitsTotal,
          tasksCompleted,
          tasksTotal,
          journalEntries,
          streak: '0', // Can be computed from historical data in a future iteration
        };

        await sendDailyDigest(email, stats);

        return reply.send({
          success: true,
          message: 'Daily digest sent',
          stats,
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to send daily digest');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to send daily digest',
        });
      }
    }
  );

  // ── POST /email/test ──────────────────────────────────────────────────
  fastify.post(
    '/test',
    { preHandler: [clerkAuth] },
    async (request, reply) => {
      try {
        const user = await clerkClient.users.getUser(request.userId);
        const email = user.emailAddresses[0]?.emailAddress;

        if (!email) {
          request.log.error('User email not found for test email');
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User email not found',
          });
        }

        // Send a digest with placeholder stats as a test
        const testStats = {
          habitsCompleted: 3,
          habitsTotal: 5,
          tasksCompleted: 7,
          tasksTotal: 10,
          journalEntries: 1,
          streak: '14',
        };

        await sendDailyDigest(email, testStats);

        return reply.send({
          success: true,
          message: `Test email sent to ${email}`,
        });
      } catch (err) {
        request.log.error({ err }, 'Failed to send test email');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to send test email',
        });
      }
    }
  );
}
