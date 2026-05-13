import { defaultSiteContent } from '../data/defaultContent.js';
import { provider } from './syncService.js';
import { isSupabaseConfigured, supabase } from './supabaseService.js';
import { isFirebaseConfigured, firebaseLoadSiteContent, firebaseSaveSiteContent } from './firebaseService.js';

const CONTENT_KEY = 'phonicsAdventure.siteContent';
const bootAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const bootTeacherEmails = (import.meta.env.VITE_TEACHER_EMAILS || '')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEmails(values) {
  return [...new Set((values || []).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))];
}

function mergeAudioLibrary(base, remote = {}) {
  return {
    letters: { ...(base?.letters || {}), ...(remote?.letters || {}) },
    sounds: { ...(base?.sounds || {}), ...(remote?.sounds || {}) },
    words: { ...(base?.words || {}), ...(remote?.words || {}) },
    phrases: { ...(base?.phrases || {}), ...(remote?.phrases || {}) },
  };
}

export function mergeSiteContent(remote) {
  const base = clone(defaultSiteContent);
  const merged = {
    ...base,
    ...(remote || {}),
    hero: { ...base.hero, ...(remote?.hero || {}) },
    teacherDashboard: { ...base.teacherDashboard, ...(remote?.teacherDashboard || {}) },
    audioLibrary: mergeAudioLibrary(base.audioLibrary, remote?.audioLibrary || {}),
    units: Array.isArray(remote?.units) && remote.units.length ? remote.units : base.units,
    stories: Array.isArray(remote?.stories) && remote.stories.length ? remote.stories : base.stories,
    games: Array.isArray(remote?.games) && remote.games.length ? remote.games : base.games,
    phonicsSounds: {
      categories: Array.isArray(remote?.phonicsSounds?.categories) && remote.phonicsSounds.categories.length ? remote.phonicsSounds.categories : base.phonicsSounds.categories,
      items: Array.isArray(remote?.phonicsSounds?.items) && remote.phonicsSounds.items.length ? remote.phonicsSounds.items : base.phonicsSounds.items,
    },
  };
  merged.adminEmails = normalizeEmails([...base.adminEmails, ...bootAdminEmails, ...(remote?.adminEmails || [])]);
  merged.teacherEmails = normalizeEmails([...base.teacherEmails, ...bootTeacherEmails, ...(remote?.teacherEmails || [])]);
  return merged;
}

function fallbackLoad() {
  const local = JSON.parse(localStorage.getItem(CONTENT_KEY) || 'null');
  return mergeSiteContent(local);
}

export async function loadSiteContent() {
  try {
    if (provider === 'supabase' && isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('site_content').select('data').eq('key', 'main').single();
      if (error && error.code !== 'PGRST116') throw error;
      const merged = mergeSiteContent(data?.data || null);
      localStorage.setItem(CONTENT_KEY, JSON.stringify(merged));
      return merged;
    }
    if (provider === 'firebase' && isFirebaseConfigured) {
      const data = await firebaseLoadSiteContent();
      const merged = mergeSiteContent(data || null);
      localStorage.setItem(CONTENT_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (error) {
    console.warn('[contentService] cloud load failed, fallback to local', error);
  }
  return fallbackLoad();
}

export async function saveSiteContent(content) {
  const merged = mergeSiteContent(content);
  localStorage.setItem(CONTENT_KEY, JSON.stringify(merged));

  try {
    if (provider === 'supabase' && isSupabaseConfigured && supabase) {
      const payload = { key: 'main', data: merged, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('site_content').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
    }
    if (provider === 'firebase' && isFirebaseConfigured) {
      await firebaseSaveSiteContent(merged);
    }
  } catch (error) {
    console.warn('[contentService] cloud save failed, local copy preserved', error);
  }
  return merged;
}

export function resetSiteContent() {
  const content = mergeSiteContent(defaultSiteContent);
  localStorage.setItem(CONTENT_KEY, JSON.stringify(content));
  return content;
}

export function isAdminUser(user, content) {
  if (!user?.email) return false;
  const email = String(user.email).toLowerCase();
  const allow = normalizeEmails([...(content?.adminEmails || []), ...bootAdminEmails]);
  return allow.includes(email);
}

export function isTeacherUser(user, content) {
  if (!user?.email) return false;
  const email = String(user.email).toLowerCase();
  const allow = normalizeEmails([...(content?.teacherEmails || []), ...bootTeacherEmails, ...(content?.adminEmails || []), ...bootAdminEmails]);
  return allow.includes(email);
}
