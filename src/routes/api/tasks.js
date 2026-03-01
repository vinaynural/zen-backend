import prisma from '../../config/db.js';
import clerkAuth from '../../middleware/clerk-auth.js';

export default async function tasksRoutes(fastify, opts) {
  fastify.addHook('preHandler', clerkAuth);

  // 1. GET ALL
  fastify.get('/', async (request, reply) => {
    try {
      const tasks = await prisma.task.findMany({
        where: { user_id: request.user.id },
      });
      return { data: tasks };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch tasks' });
    }
  });

  // 2. GET BY ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const task = await prisma.task.findUnique({ where: { id } });

      if (!task || task.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      return { data: task };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch task' });
    }
  });

  // 3. CREATE
  fastify.post('/', async (request, reply) => {
    try {
      const data = { ...request.body, user_id: request.user.id };
      const newTask = await prisma.task.create({ data });
      return reply.code(201).send({ data: newTask });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create task' });
    }
  });

  // 4. UPDATE
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Task not found' });
      }

      // Block changing user_id
      const data = { ...request.body };
      delete data.user_id;

      const updatedTask = await prisma.task.update({
        where: { id },
        data,
      });
      return { data: updatedTask };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update task' });
    }
  });

  // 5. DELETE
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.task.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Task not found' });
      }
      await prisma.task.delete({ where: { id } });
      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete task' });
    }
  });
}
