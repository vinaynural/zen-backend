import { clerkClient, verifyToken } from '@clerk/fastify';
import env from '../config/env.js';

/**
 * Fastify preHandler hook that verifies a Clerk JWT from the
 * Authorization header and attaches the authenticated user's ID
 * to `request.userId`.
 *
 * Usage:
 *   fastify.get('/protected', { preHandler: [clerkAuth] }, handler);
 *
 * The hook expects:
 *   Authorization: Bearer <clerk_session_jwt>
 */
async function clerkAuth(request, reply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const sessionClaims = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });

    if (!sessionClaims || !sessionClaims.sub) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid session token',
      });
    }

    // Attach userId (Clerk's `sub` claim) to the request for downstream use
    request.userId = sessionClaims.sub;
    request.sessionClaims = sessionClaims;
  } catch (err) {
    request.log.error({ err }, 'Clerk auth verification failed');

    if (err.message?.includes('expired')) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Token has expired',
      });
    }

    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

export default clerkAuth;
