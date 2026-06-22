import { createClient } from '@supabase/supabase-js';

// Fallback values prevent client initialization crashes if env variables are not yet populated.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Signs in a user using email and password.
 */
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

/**
 * Signs out the currently logged in user.
 */
export const signOut = async () => {
  return await supabase.auth.signOut();
};

/**
 * Returns the currently authenticated user details, or null if unauthenticated.
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
};
export default supabase;
