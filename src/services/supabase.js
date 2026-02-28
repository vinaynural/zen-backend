import { createClient } from '@supabase/supabase-js';
import env from '../config/env.js';

/**
 * Supabase admin client initialized with the service role key.
 * This client bypasses Row Level Security and should only be used
 * server-side with proper authorization checks in the application layer.
 */
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
