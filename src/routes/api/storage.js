import supabase from '../../config/supabase.js';
import clerkAuth from '../../middleware/clerk-auth.js';

export default async function storageRoutes(fastify, opts) {
  // Protect all storage routes with Clerk Auth
  fastify.addHook('preHandler', clerkAuth);

  // POST /api/storage/presigned-url
  // Generate a presigned URL to upload a file directly to Supabase Storage
  fastify.post('/presigned-url', async (request, reply) => {
    const { bucket, path } = request.body;

    if (!bucket || !path) {
      return reply.code(400).send({ error: 'Bucket and path are required' });
    }

    try {
      // Create a signed URL valid for 60 seconds (or more if needed)
      // Note: We use the service_role key to bypass RLS when generating the upload URL
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);

      if (error) {
        fastify.log.error('Supabase createSignedUploadUrl Error:', error);
        return reply.code(500).send({ error: error.message });
      }

      // Return the signed URL to the Flutter client so it can upload directly via PUT
      return {
        signedUrl: data.signedUrl,
        path: data.path,
        token: data.token,
      };
    } catch (err) {
      fastify.log.error('Unexpected Storage Error:', err);
      return reply.code(500).send({ error: 'Failed to generate presigned URL' });
    }
  });
}
