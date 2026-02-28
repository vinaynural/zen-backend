import { Webhook } from 'svix';
import env from '../config/env.js';
import supabase from '../services/supabase.js';
import { sendWelcomeEmail } from '../services/resend.js';

/**
 * Auth route plugin — handles Clerk webhooks.
 *
 * - POST /webhooks/clerk — receives Clerk webhook events
 *
 * The webhook payload is verified using the svix library and the
 * CLERK_WEBHOOK_SECRET before processing.
 */
export default async function authRoutes(fastify) {
  // Clerk sends JSON, but we need the raw body for signature verification.
  // Fastify v5 provides request.rawBody when we add the content type parser
  // config, but it's simpler to just re-stringify.
  fastify.post(
    '/webhooks/clerk',
    {
      config: {
        // Disable automatic body parsing so we can access raw body for verification.
        rawBody: true,
      },
    },
    async (request, reply) => {
      const webhookSecret = env.CLERK_WEBHOOK_SECRET;

      if (!webhookSecret) {
        request.log.error('CLERK_WEBHOOK_SECRET is not configured');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Webhook secret not configured',
        });
      }

      // ── Verify signature ──────────────────────────────────────────────
      const svixId = request.headers['svix-id'];
      const svixTimestamp = request.headers['svix-timestamp'];
      const svixSignature = request.headers['svix-signature'];

      if (!svixId || !svixTimestamp || !svixSignature) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Missing svix verification headers',
        });
      }

      let event;

      try {
        const wh = new Webhook(webhookSecret);
        const rawBody =
          typeof request.body === 'string'
            ? request.body
            : JSON.stringify(request.body);

        event = wh.verify(rawBody, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch (err) {
        request.log.error({ err }, 'Webhook signature verification failed');
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid webhook signature',
        });
      }

      // ── Handle events ─────────────────────────────────────────────────
      const eventType = event.type;
      request.log.info({ eventType }, 'Received Clerk webhook event');

      if (eventType === 'user.created') {
        try {
          await handleUserCreated(event.data, request.log);
        } catch (err) {
          request.log.error({ err }, 'Failed to handle user.created event');
          // Return 500 so Clerk retries the webhook
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to process user.created event',
          });
        }
      }

      // Acknowledge receipt for all event types
      return reply.code(200).send({ received: true });
    }
  );
}

/**
 * Handle the user.created Clerk event:
 *   1. Insert a new row into the Supabase "users" table
 *   2. Send a welcome email via Resend
 */
async function handleUserCreated(data, log) {
  const {
    id: clerkUserId,
    email_addresses = [],
    first_name,
    last_name,
  } = data;

  const primaryEmail =
    email_addresses.find((e) => e.id === data.primary_email_address_id)
      ?.email_address || email_addresses[0]?.email_address;

  const displayName = [first_name, last_name].filter(Boolean).join(' ') || 'there';

  // ── Insert into Supabase ────────────────────────────────────────────
  const { error: dbError } = await supabase.from('users').insert({
    id: clerkUserId,
    email: primaryEmail,
    name: displayName,
    created_at: new Date().toISOString(),
  });

  if (dbError) {
    log.error({ dbError }, 'Failed to insert user into Supabase');
    throw new Error(`Supabase insert failed: ${dbError.message}`);
  }

  log.info({ clerkUserId, primaryEmail }, 'User inserted into Supabase');

  // ── Send welcome email ──────────────────────────────────────────────
  if (primaryEmail) {
    try {
      await sendWelcomeEmail(primaryEmail, displayName);
      log.info({ primaryEmail }, 'Welcome email sent');
    } catch (emailErr) {
      // Log but don't throw — the user record is already saved.
      log.error({ emailErr }, 'Failed to send welcome email (non-fatal)');
    }
  }
}
