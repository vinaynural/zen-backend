import clerkAuth from '../middleware/clerk-auth.js';
import supabase from '../services/supabase.js';

/**
 * Allowed entity types that map to Supabase table names.
 */
const ALLOWED_ENTITIES = new Set([
  'habits',
  'dsa',
  'health',
  'journal',
  'tasks',
  'goals',
  'notifications',
]);

/**
 * Validate that the entity parameter is in the allowed list.
 */
function validateEntity(entity) {
  if (!ALLOWED_ENTITIES.has(entity)) {
    return {
      valid: false,
      message: `Invalid entity "${entity}". Allowed: ${[...ALLOWED_ENTITIES].join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Sync route plugin.
 *
 * - GET  /sync/:entity      — fetch all records for the authenticated user
 * - POST /sync/:entity/sync — upsert an array of records for the authenticated user
 *
 * All routes require Clerk JWT authentication.
 */
export default async function syncRoutes(fastify) {
  // ── GET /sync/:entity ─────────────────────────────────────────────────
  fastify.get(
    '/:entity',
    { preHandler: [clerkAuth] },
    async (request, reply) => {
      const { entity } = request.params;

      const check = validateEntity(entity);
      if (!check.valid) {
        return reply.code(400).send({ error: 'Bad Request', message: check.message });
      }

      try {
        const { data, error } = await supabase
          .from(entity)
          .select('*')
          .eq('user_id', request.userId)
          .order('updated_at', { ascending: false });

        if (error) {
          request.log.error({ error, entity }, 'Supabase fetch failed');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to fetch data',
          });
        }

        return reply.send({ data });
      } catch (err) {
        request.log.error({ err, entity }, 'Unexpected error during fetch');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
      }
    }
  );

  // ── POST /sync/:entity/sync ───────────────────────────────────────────
  fastify.post(
    '/:entity/sync',
    { preHandler: [clerkAuth] },
    async (request, reply) => {
      const { entity } = request.params;

      const check = validateEntity(entity);
      if (!check.valid) {
        return reply.code(400).send({ error: 'Bad Request', message: check.message });
      }

      const { items } = request.body || {};

      if (!Array.isArray(items)) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: '"items" must be an array',
        });
      }

      if (items.length === 0) {
        return reply.send({ data: [], upserted: 0 });
      }

      // Cap batch size to prevent abuse
      const MAX_BATCH = 500;
      if (items.length > MAX_BATCH) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Batch size exceeds maximum of ${MAX_BATCH} items`,
        });
      }

      try {
        // Inject the authenticated user_id into every item
        const rows = items.map((item) => ({
          ...item,
          user_id: request.userId,
        }));

        const { data, error } = await supabase
          .from(entity)
          .upsert(rows, {
            onConflict: 'id',
            ignoreDuplicates: false,
          })
          .select();

        if (error) {
          request.log.error({ error, entity }, 'Supabase upsert failed');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to sync data',
          });
        }

        return reply.send({ data, upserted: data.length });
      } catch (err) {
        request.log.error({ err, entity }, 'Unexpected error during sync');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        });
      }
    }
  );
}
