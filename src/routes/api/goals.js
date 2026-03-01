import prisma from '../../config/db.js';
import clerkAuth from '../../middleware/clerk-auth.js';

export default async function goalsRoutes(fastify, opts) {
  fastify.addHook('preHandler', clerkAuth);

  fastify.get('/', async (request, reply) => {
    try {
      const goals = await prisma.goal.findMany({
        where: { user_id: request.user.id },
      });
      return { data: goals };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch goals' });
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const goal = await prisma.goal.findUnique({ where: { id } });

      if (!goal || goal.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Goal not found' });
      }
      return { data: goal };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch goal' });
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const data = { ...request.body, user_id: request.user.id };
      const newGoal = await prisma.goal.create({ data });
      return reply.code(201).send({ data: newGoal });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create goal' });
    }
  });

  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.goal.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Goal not found' });
      }

      const data = { ...request.body };
      delete data.user_id;

      const updatedGoal = await prisma.goal.update({
        where: { id },
        data,
      });
      return { data: updatedGoal };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update goal' });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.goal.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Goal not found' });
      }
      await prisma.goal.delete({ where: { id } });
      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete goal' });
    }
  });
}
