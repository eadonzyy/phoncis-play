import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_PROJECT_ID') &&
  !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase 尚未設定。請檢查 .env 的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。');
  }
  return supabase;
}

export async function supabaseGetCurrentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user ? { id: data.user.id, email: data.user.email, provider: 'supabase' } : null;
}

export async function supabaseSignUp(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data.user ? { id: data.user.id, email: data.user.email, provider: 'supabase' } : null;
}

export async function supabaseSignIn(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user ? { id: data.user.id, email: data.user.email, provider: 'supabase' } : null;
}

export async function supabaseSignOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function supabaseLoadProgress() {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return {};

  const { data, error } = await client
    .from('student_progress')
    .select('data')
    .eq('user_id', userData.user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.data || {};
}

export async function supabaseSaveProgress(progress) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error('請先登入才能同步進度。');

  const payload = {
    user_id: userData.user.id,
    data: progress,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from('student_progress')
    .upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
  return progress;
}
