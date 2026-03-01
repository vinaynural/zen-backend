import prisma from '../../config/db.js';
import clerkAuth from '../../middleware/clerk-auth.js';

export default async function journalRoutes(fastify, opts) {
  fastify.addHook('preHandler', clerkAuth);

  fastify.get('/', async (request, reply) => {
    try {
      const entries = await prisma.journal.findMany({
        where: { user_id: request.user.id },
      });
      return { data: entries };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch journal entries' });
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const entry = await prisma.journal.findUnique({ where: { id } });

      if (!entry || entry.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Journal entry not found' });
      }
      return { data: entry };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch journal entry' });
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const data = { ...request.body, user_id: request.user.id };
      const newEntry = await prisma.journal.create({ data });
      return reply.code(201).send({ data: newEntry });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create journal entry' });
    }
  });

  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.journal.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Journal entry not found' });
      }

      const data = { ...request.body };
      delete data.user_id;

      const updatedEntry = await prisma.journal.update({
        where: { id },
        data,
      });
      return { data: updatedEntry };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update journal entry' });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.journal.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Journal entry not found' });
      }
      await prisma.journal.delete({ where: { id } });
      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete journal entry' });
    }
  });
}
