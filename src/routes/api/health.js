import prisma from '../../config/db.js';
import clerkAuth from '../../middleware/clerk-auth.js';

export default async function healthRoutes(fastify, opts) {
  fastify.addHook('preHandler', clerkAuth);

  fastify.get('/', async (request, reply) => {
    try {
      const health = await prisma.health.findMany({
        where: { user_id: request.user.id },
      });
      return { data: health };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch health logs' });
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const log = await prisma.health.findUnique({ where: { id } });

      if (!log || log.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Health log not found' });
      }
      return { data: log };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch health log' });
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const data = { ...request.body, user_id: request.user.id };
      
      // Fastify automatically parses dates string in JSON, Ensure it's passed down.
      if (data.date) { data.date = new Date(data.date); }

      const newLog = await prisma.health.create({ data });
      return reply.code(201).send({ data: newLog });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create health log' });
    }
  });

  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.health.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Health log not found' });
      }

      const data = { ...request.body };
      delete data.user_id;
      if (data.date) { data.date = new Date(data.date); }

      const updatedLog = await prisma.health.update({
        where: { id },
        data,
      });
      return { data: updatedLog };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update health log' });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.health.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Health log not found' });
      }
      await prisma.health.delete({ where: { id } });
      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete health log' });
    }
  });
}
