import { getSoundEntry } from '../data/sounds.js';

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
      window.setTimeout(playNext, 100);
    };
    window.speechSynthesis.speak(utterance);
  };

  playNext();
}

export function speakText(text, options = {}) {
  queueSpeak([text], { rate: options.rate || 0.78, pitch: options.pitch || 1 });
}

export function speakWord(word) {
  queueSpeak([word], { rate: 0.72, pitch: 1 });
}

export function speakPhonicsSound(key, includeExample = true) {
  const entry = getSoundEntry(key);
  if (!entry) {
    speakWord(key);
    return;
  }

  const parts = includeExample
    ? [entry.sayAs, `${entry.example}.`, `${entry.sayAs}.`]
    : [entry.sayAs];
  queueSpeak(parts, { rate: 0.62, pitch: 1.08 });
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
