import clerkAuth from '../middleware/clerk-auth.js';
import supabase from '../services/supabase.js';
import { sendDailyDigest } from '../services/resend.js';

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
        // Look up the user's email from Supabase
        const { data: user, error: userErr } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', request.userId)
          .single();

        if (userErr || !user) {
          request.log.error({ userErr }, 'User not found for daily digest');
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        // Gather today's stats
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        const [habitsResult, tasksResult, journalResult] = await Promise.all([
          supabase
            .from('habits')
            .select('id, completed', { count: 'exact' })
            .eq('user_id', request.userId)
            .gte('updated_at', `${today}T00:00:00`)
            .lte('updated_at', `${today}T23:59:59`),
          supabase
            .from('tasks')
            .select('id, completed', { count: 'exact' })
            .eq('user_id', request.userId)
            .gte('updated_at', `${today}T00:00:00`)
            .lte('updated_at', `${today}T23:59:59`),
          supabase
            .from('journal')
            .select('id', { count: 'exact' })
            .eq('user_id', request.userId)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`),
        ]);

        const habits = habitsResult.data || [];
        const tasks = tasksResult.data || [];

        const stats = {
          habitsCompleted: habits.filter((h) => h.completed).length,
          habitsTotal: habits.length,
          tasksCompleted: tasks.filter((t) => t.completed).length,
          tasksTotal: tasks.length,
          journalEntries: journalResult.data?.length || 0,
          streak: '0', // Can be computed from historical data in a future iteration
        };

        await sendDailyDigest(user.email, stats);

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
        const { data: user, error: userErr } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', request.userId)
          .single();

        if (userErr || !user) {
          request.log.error({ userErr }, 'User not found for test email');
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
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

        await sendDailyDigest(user.email, testStats);

        return reply.send({
          success: true,
          message: `Test email sent to ${user.email}`,
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
