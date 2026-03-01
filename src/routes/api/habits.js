import prisma from '../../config/db.js';
import clerkAuth from '../../middleware/clerk-auth.js';

export default async function habitsRoutes(fastify, opts) {
  // Protect all habit routes with Clerk Auth
  fastify.addHook('preHandler', clerkAuth);

  // 1. GET ALL
  fastify.get('/', async (request, reply) => {
    try {
      const habits = await prisma.habit.findMany({
        where: { user_id: request.user.id },
      });
      return { data: habits };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch habits' });
    }
  });

  // 2. GET BY ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const habit = await prisma.habit.findUnique({
        where: { id },
      });

      if (!habit || habit.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Habit not found' });
      }

      return { data: habit };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch habit' });
    }
  });

  // 3. CREATE
  fastify.post('/', async (request, reply) => {
    try {
      const { id, title, description, category, color_hex, icon_name, frequency_type } = request.body;
      const newHabit = await prisma.habit.create({
        data: {
          id: id, // Optional: if Flutter generates UUID
          user_id: request.user.id,
          title,
          description,
          category,
          color_hex,
          icon_name,
          frequency_type,
        },
      });
      return reply.code(201).send({ data: newHabit });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create habit' });
    }
  });

  // 4. UPDATE
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Ensure habit belongs to user
      const existing = await prisma.habit.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Habit not found' });
      }

      const updatedHabit = await prisma.habit.update({
        where: { id },
        data: request.body,
      });

      return { data: updatedHabit };
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update habit' });
    }
  });

  // 5. DELETE
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const existing = await prisma.habit.findUnique({ where: { id } });
      if (!existing || existing.user_id !== request.user.id) {
        return reply.code(404).send({ error: 'Habit not found' });
      }

      await prisma.habit.delete({
        where: { id },
      });

      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete habit' });
    }
  });
}
