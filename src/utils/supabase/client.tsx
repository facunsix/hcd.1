import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single shared Supabase client instance with enhanced persistence
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      // Enable automatic session refresh
      autoRefreshToken: true,
      // Persist session across browser sessions
      persistSession: true,
      // Use localStorage to store session data
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Detect session from URL on redirect (for social logins)
      detectSessionInUrl: true,
      // Automatically refresh token when it expires
      flowType: 'pkce'
    }
  }
);