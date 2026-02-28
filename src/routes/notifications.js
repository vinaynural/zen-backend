import clerkAuth from '../middleware/clerk-auth.js';
import supabase from '../services/supabase.js';

/**
 * Notification route plugin.
 *
 * - POST /notifications/send — create a notification record for the authenticated user
 * - GET  /notifications      — retrieve all notifications for the authenticated user
 *
 * All routes require Clerk JWT authentication.
 */
export default async function notificationRoutes(fastify) {
  // ── POST /notifications/send ──────────────────────────────────────────
  fastify.post(
    '/send',
    { preHandler: [clerkAuth] },
    async (request, reply) => {
      const { title, body, type, metadata } = request.body || {};

      // Basic validation
      if (!title || typeof title !== 'string') {
        return reply.code(400).send({
          error: 'Bad Request',
          message: '"title" is required and must be a string',
        });
      }

      if (!body || typeof body !== 'string') {
        return reply.code(400).send({
          error: 'Bad Request',
          message: '"body" is required and must be a string',
        });
      }

      try {
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: request.userId,
            title,
            body,
            type: type || 'general',
            metadata: metadata || {},
            read: false,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          request.log.error({ error }, 'Failed to create notification');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to create notification',
          });
        }

        return reply.code(201).send({ data });
      } catch (err) {
        request.log.error({ err }, 'Unexpected error creating notification');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
      }
    }
  );

  // ── GET /notifications ────────────────────────────────────────────────
  fastify.get(
    '/',
    { preHandler: [clerkAuth] },
    async (request, reply) => {
      const { limit = 50, offset = 0, unread_only } = request.query || {};

      try {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', request.userId)
          .order('created_at', { ascending: false })
          .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (unread_only === 'true') {
          query = query.eq('read', false);
        }

        const { data, error } = await query;

        if (error) {
          request.log.error({ error }, 'Failed to fetch notifications');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to fetch notifications',
          });
        }

        return reply.send({ data });
      } catch (err) {
        request.log.error({ err }, 'Unexpected error fetching notifications');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
      }
    }
  );
}
