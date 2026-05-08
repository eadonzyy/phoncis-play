import { getSoundEntry } from '../data/sounds.js';

let uploadedAudioLibrary = {
  letters: {},
  sounds: {},
  words: {},
  phrases: {},
};

export function setAudioLibrary(library = {}) {
  uploadedAudioLibrary = {
    letters: library.letters || {},
    sounds: library.sounds || {},
    words: library.words || {},
    phrases: library.phrases || {},
  };
}

function getEnglishVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices?.() || [];
  return voices.find((voice) => voice.lang === 'en-US' && /female|samantha|jenny|aria|google/i.test(voice.name))
    || voices.find((voice) => voice.lang === 'en-US')
    || voices.find((voice) => voice.lang?.startsWith('en'))
    || null;
}

function queueSpeak(parts, { rate = 0.72, pitch = 1.05 } = {}) {
  if (!('speechSynthesis' in window)) return;
  const cleanParts = parts.map((part) => String(part || '').trim()).filter(Boolean);
  if (!cleanParts.length) return;

  window.speechSynthesis.cancel();
  const voice = getEnglishVoice();
  let index = 0;

  const playNext = () => {
    if (index >= cleanParts.length) return;
    const utterance = new SpeechSynthesisUtterance(cleanParts[index]);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      index += 1;
      window.setTimeout(playNext, 90);
    };
    window.speechSynthesis.speak(utterance);
  };

  playNext();
}

function sanitizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function getUploadedAudio(category, key) {
  const item = uploadedAudioLibrary?.[category]?.[sanitizeKey(key)];
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.dataUrl || item.url || '';
}

function playAudioFile(path) {
  return new Promise((resolve, reject) => {
    if (!path) {
      reject(new Error('No audio path'));
      return;
    }
    const audio = new Audio(path);
    let settled = false;
    audio.oncanplaythrough = () => {
      audio.play().then(() => {
        settled = true;
        resolve(true);
      }).catch(reject);
    };
    audio.onerror = () => {
      if (!settled) reject(new Error(`Audio not found: ${path.slice(0, 60)}`));
    };
  });
}

async function speakOrPlay(pathCandidates, fallback) {
  for (const path of pathCandidates) {
    try {
      await playAudioFile(path);
      return;
    } catch (error) {
      // Try next audio source, then fall back to browser voice.
    }
  }
  fallback();
}

export function speakText(text, options = {}) {
  const key = sanitizeKey(text).slice(0, 80);
  speakOrPlay([
    getUploadedAudio('phrases', key),
    `${import.meta.env.BASE_URL}audio/phrases/${key}.mp3`,
  ], () => queueSpeak([text], { rate: options.rate || 0.78, pitch: options.pitch || 1 }));
}

export function speakWord(word) {
  const key = sanitizeKey(word);
  speakOrPlay([
    getUploadedAudio('words', key),
    `${import.meta.env.BASE_URL}audio/words/${key}.mp3`,
    getUploadedAudio('phrases', key),
    `${import.meta.env.BASE_URL}audio/phrases/${key}.mp3`,
  ], () => queueSpeak([word], { rate: 0.72, pitch: 1 }));
}

export function speakPhonicsSound(key, includeExample = true) {
  const entry = getSoundEntry(key);
  if (!entry) {
    speakWord(key);
    return;
  }
  const folder = entry.key.length === 1 ? 'letters' : 'sounds';
  const soundKey = sanitizeKey(entry.key);
  const exampleKey = sanitizeKey(entry.example);
  const fallback = () => {
    const parts = includeExample ? [entry.sayAs, `${entry.example}.`, `${entry.sayAs}.`] : [entry.sayAs];
    queueSpeak(parts, { rate: 0.62, pitch: 1.08 });
  };
  speakOrPlay([
    getUploadedAudio(folder, soundKey),
    `${import.meta.env.BASE_URL}audio/${folder}/${soundKey}.mp3`,
    includeExample ? getUploadedAudio('words', exampleKey) : '',
    includeExample ? `${import.meta.env.BASE_URL}audio/words/${exampleKey}.mp3` : '',
  ].filter(Boolean), fallback);
}

export function speakBlendWord(word) {
  const letters = String(word || '').toLowerCase().split('');
  const parts = letters.map((letter) => getSoundEntry(letter)?.sayAs || letter);
  parts.push(word);
  queueSpeak(parts, { rate: 0.58, pitch: 1.08 });
}

export function speakPattern(pattern) {
  const raw = String(pattern || '').trim();
  if (!raw) return;

  const ipaMatch = raw.match(/^([a-z]{1,3})\s+\//i);
  if (ipaMatch) {
    speakPhonicsSound(ipaMatch[1], true);
    return;
  }

  if (raw.includes('→')) {
    const [left, right] = raw.split('→').map((part) => part.trim());
    const sequence = left
      .split('-')
      .map((part) => getSoundEntry(part.trim())?.sayAs || part.trim())
      .filter(Boolean);
    queueSpeak([...sequence, right], { rate: 0.58, pitch: 1.08 });
    return;
  }

  if (raw.includes(':')) {
    const [soundKey, word] = raw.split(':').map((part) => part.trim());
    const entry = getSoundEntry(soundKey);
    if (entry) {
      queueSpeak([entry.sayAs, word, entry.sayAs], { rate: 0.62, pitch: 1.08 });
      return;
    }
  }

  const entry = getSoundEntry(raw);
  if (entry) {
    speakPhonicsSound(raw, true);
    return;
  }

  speakText(raw.replace(/[/:]/g, ' '));
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
