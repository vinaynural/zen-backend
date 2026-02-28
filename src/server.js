import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import env, { validateEnv } from './config/env.js';
import syncRoutes from './routes/sync.js';
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/email.js';
import notificationRoutes from './routes/notifications.js';

// ── Validate environment ──────────────────────────────────────────────────
validateEnv();

// ── Create Fastify instance ───────────────────────────────────────────────
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  // Increase body size limit slightly for sync payloads
  bodyLimit: 1_048_576, // 1 MB
});

// ── Register plugins ──────────────────────────────────────────────────────
await fastify.register(cors, {
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});

await fastify.register(helmet, {
  // Allow cross-origin requests (typical for a mobile app backend)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// ── Health check ──────────────────────────────────────────────────────────
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}));

// ── Register route modules ────────────────────────────────────────────────
await fastify.register(syncRoutes, { prefix: '/sync' });
await fastify.register(authRoutes);
await fastify.register(emailRoutes, { prefix: '/email' });
await fastify.register(notificationRoutes, { prefix: '/notifications' });

// ── Global error handler ──────────────────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'Unhandled error');

  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.code(429).send({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }

  // Validation errors from Fastify
  if (error.validation) {
    return reply.code(400).send({
      error: 'Bad Request',
      message: error.message,
    });
  }

  // Default 500
  return reply.code(error.statusCode || 500).send({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
const shutdown = async (signal) => {
  fastify.log.info({ signal }, 'Received shutdown signal');
  await fastify.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── Start server ──────────────────────────────────────────────────────────
try {
  await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
  fastify.log.info(`Server running on http://0.0.0.0:${env.PORT}`);
} catch (err) {
  fastify.log.fatal(err, 'Failed to start server');
  process.exit(1);
}
