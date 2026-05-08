import {
  localGetCurrentUser,
  localSignIn,
  localSignOut,
  localSignUp,
  localLoadProgress,
  localSaveProgress,
} from './localService.js';
import {
  isSupabaseConfigured,
  supabaseGetCurrentUser,
  supabaseSignIn,
  supabaseSignOut,
  supabaseSignUp,
  supabaseLoadProgress,
  supabaseSaveProgress,
} from './supabaseService.js';
import {
  isFirebaseConfigured,
  firebaseGetCurrentUser,
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignUp,
  firebaseLoadProgress,
  firebaseSaveProgress,
} from './firebaseService.js';

export const provider = import.meta.env.VITE_SYNC_PROVIDER || 'local';

export function getProviderStatus() {
  if (provider === 'supabase') return { name: 'Supabase', configured: isSupabaseConfigured };
  if (provider === 'firebase') return { name: 'Firebase', configured: isFirebaseConfigured };
  return { name: 'LocalStorage', configured: true };
}

function fallbackToLocal(error) {
  console.warn('[Phonics Adventure] Cloud sync failed. Falling back to local mode:', error);
}

export async function getCurrentUser() {
  try {
    if (provider === 'supabase' && isSupabaseConfigured) return await supabaseGetCurrentUser();
    if (provider === 'firebase' && isFirebaseConfigured) return await firebaseGetCurrentUser();
    return await localGetCurrentUser();
  } catch (error) {
    fallbackToLocal(error);
    return await localGetCurrentUser();
  }
}

export async function signUp(email, password) {
  if (provider === 'supabase' && isSupabaseConfigured) return await supabaseSignUp(email, password);
  if (provider === 'firebase' && isFirebaseConfigured) return await firebaseSignUp(email, password);
  return await localSignUp(email, password);
}

export async function signIn(email, password) {
  if (provider === 'supabase' && isSupabaseConfigured) return await supabaseSignIn(email, password);
  if (provider === 'firebase' && isFirebaseConfigured) return await firebaseSignIn(email, password);
  return await localSignIn(email, password);
}

export async function signOut() {
  if (provider === 'supabase' && isSupabaseConfigured) return await supabaseSignOut();
  if (provider === 'firebase' && isFirebaseConfigured) return await firebaseSignOut();
  return await localSignOut();
}

export async function loadProgress() {
  try {
    if (provider === 'supabase' && isSupabaseConfigured) return await supabaseLoadProgress();
    if (provider === 'firebase' && isFirebaseConfigured) return await firebaseLoadProgress();
    return await localLoadProgress();
  } catch (error) {
    fallbackToLocal(error);
    return await localLoadProgress();
  }
}

export async function saveProgress(progress) {
  try {
    if (provider === 'supabase' && isSupabaseConfigured) return await supabaseSaveProgress(progress);
    if (provider === 'firebase' && isFirebaseConfigured) return await firebaseSaveProgress(progress);
    return await localSaveProgress(progress);
  } catch (error) {
    fallbackToLocal(error);
    return await localSaveProgress(progress);
  }
}
