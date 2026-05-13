import { provider } from './syncService.js';
import { isSupabaseConfigured, supabase } from './supabaseService.js';
import { isFirebaseConfigured, firebaseStorage } from './firebaseService.js';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const DEFAULT_BUCKET = import.meta.env.VITE_AUDIO_STORAGE_BUCKET || 'phonics-audio';
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function getExtension(file) {
  const byName = file.name?.split('.').pop()?.toLowerCase();
  if (byName && byName.length <= 5) return byName;
  if (file.type === 'audio/mpeg') return 'mp3';
  if (file.type === 'audio/wav') return 'wav';
  if (file.type === 'audio/ogg') return 'ogg';
  if (file.type === 'audio/webm') return 'webm';
  return 'mp3';
}

function assertAudioFile(file) {
  if (!file) throw new Error('請先選擇音頻檔案。');
  if (!file.type?.startsWith('audio/')) throw new Error('請上傳 audio 類型檔案，例如 mp3、wav、ogg。');
  if (file.size > MAX_AUDIO_SIZE) throw new Error('音檔太大，請控制在 10MB 以內。');
}

function localPreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getAudioStorageStatus() {
  if (provider === 'supabase' && isSupabaseConfigured) {
    return { provider: 'supabase', label: `Supabase Storage / ${DEFAULT_BUCKET}`, configured: true };
  }
  if (provider === 'firebase' && isFirebaseConfigured && firebaseStorage) {
    return { provider: 'firebase', label: 'Firebase Storage', configured: true };
  }
  return { provider: 'local', label: '本機預覽模式（未配置雲端 Storage）', configured: false };
}

export async function uploadManagedAudio({ category = 'sounds', key, file, itemId = '' }) {
  assertAudioFile(file);
  const safeCategory = slug(category || 'sounds') || 'sounds';
  const safeKey = slug(key || itemId || file.name.replace(/\.[^.]+$/, '')) || `audio-${Date.now()}`;
  const extension = getExtension(file);
  const filename = `${Date.now()}-${safeKey}.${extension}`;
  const path = `${safeCategory}/${safeKey}/${filename}`;
  const contentType = file.type || 'audio/mpeg';

  if (provider === 'supabase' && isSupabaseConfigured && supabase) {
    const { error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });
    if (error) throw error;
    const { data } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(path);
    return {
      key: safeKey,
      url: data.publicUrl,
      path,
      bucket: DEFAULT_BUCKET,
      storage: 'supabase',
      name: file.name,
      size: file.size,
      contentType,
      updatedAt: new Date().toISOString(),
    };
  }

  if (provider === 'firebase' && isFirebaseConfigured && firebaseStorage) {
    const storagePath = `phonics-audio/${path}`;
    const storageRef = ref(firebaseStorage, storagePath);
    await uploadBytes(storageRef, file, { contentType });
    const url = await getDownloadURL(storageRef);
    return {
      key: safeKey,
      url,
      path: storagePath,
      bucket: 'firebase-storage',
      storage: 'firebase',
      name: file.name,
      size: file.size,
      contentType,
      updatedAt: new Date().toISOString(),
    };
  }

  const dataUrl = await localPreview(file);
  return {
    key: safeKey,
    dataUrl,
    path,
    bucket: 'local-preview',
    storage: 'local-preview',
    name: file.name,
    size: file.size,
    contentType,
    updatedAt: new Date().toISOString(),
  };
}
