import { useEffect, useMemo, useState } from 'react';
import { defaultSiteContent } from './data/defaultContent.js';
import { defaultPhonicsSounds } from './data/phonicsSounds.js';
import { getSoundSymbol } from './data/sounds.js';
import { speakText, speakWord, speakPhonicsSound, setAudioLibrary } from './utils/speech.js';
import { getCurrentUser, loadProgress, saveProgress, signIn, signOut, signUp } from './services/syncService.js';
import { isAdminUser, isTeacherUser, loadSiteContent, mergeSiteContent, resetSiteContent, saveSiteContent } from './services/contentService.js';
import { getAudioStorageStatus, uploadManagedAudio } from './services/audioStorageService.js';

const APP_VERSION = 'v1.8.0';
const GAME_LENGTH = 10;

const defaultProgress = {
  stars: 0,
  completedUnits: {},
  mistakes: [],
  badges: [],
  lastPracticed: null,
  practiceCount: 0,
  streakDays: 0,
  practiceWords: {},
  readingLog: 0,
};

const audioCategories = [
  ['sounds', '音素 / phonics sounds'],
  ['letters', '字母音 / letters'],
  ['words', '單字 / words'],
  ['phrases', '句子 / phrases'],
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slug(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function splitLines(value) {
  return String(value || '').split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function pairLinesToArray(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((pair) => pair[0] && pair[1]);
}

function pairsToText(pairs) {
  return (pairs || []).map((pair) => `${pair[0]}|${pair[1]}`).join('\n');
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function mergeProgress(remote) {
  return {
    ...defaultProgress,
    ...(remote || {}),
    completedUnits: { ...defaultProgress.completedUnits, ...(remote?.completedUnits || {}) },
    mistakes: remote?.mistakes || [],
    badges: remote?.badges || [],
    practiceWords: { ...defaultProgress.practiceWords, ...(remote?.practiceWords || {}) },
  };
}

function getDateString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function getYesterdayString(todayString) {
  const date = new Date(todayString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function updatePracticeProgress(progress, skill, word = '') {
  const today = getDateString(new Date().toISOString());
  const lastDate = getDateString(progress.lastPracticed);
  const streakDays = !lastDate
    ? 1
    : lastDate === today
      ? progress.streakDays || 1
      : lastDate === getYesterdayString(today)
        ? (progress.streakDays || 1) + 1
        : 1;

  const practiceWords = { ...progress.practiceWords };
  if (word) practiceWords[String(word).toLowerCase()] = (practiceWords[String(word).toLowerCase()] || 0) + 1;

  return {
    ...progress,
    lastPracticed: new Date().toISOString(),
    practiceCount: (progress.practiceCount || 0) + 1,
    streakDays,
    practiceWords,
    readingLog: skill === 'reader' ? (progress.readingLog || 0) + 1 : (progress.readingLog || 0),
  };
}

function normalizeUnit(unit) {
  const sourceItems = Array.isArray(unit.items) && unit.items.length
    ? unit.items
    : [
      ...(unit.patterns || []).map((label, index) => ({
        id: `${unit.id}-pattern-${index}-${slug(label)}`,
        type: 'pattern',
        label,
        enabled: true,
        patterns: [label],
        words: [],
        storyTitle: unit.storyTitle || '',
      })),
      ...(unit.words || []).map((label, index) => ({
        id: `${unit.id}-word-${index}-${slug(label)}`,
        type: 'word',
        label,
        enabled: true,
        patterns: [],
        words: [label],
        storyTitle: unit.storyTitle || '',
      })),
    ];

  return {
    enabled: true,
    learnTips: [],
    patterns: [],
    words: [],
    blendingSet: [],
    magicEPairs: [],
    storyTitle: '',
    ...unit,
    items: sourceItems.map((item, index) => ({
      id: item.id || `${unit.id}-item-${index}-${slug(item.label)}`,
      type: item.type || 'pattern',
      label: item.label || `Item ${index + 1}`,
      enabled: item.enabled !== false,
      patterns: Array.isArray(item.patterns) ? item.patterns : [],
      words: Array.isArray(item.words) ? item.words : [],
      storyTitle: item.storyTitle || unit.storyTitle || '',
    })),
  };
}

function normalizePhonicsSounds(value) {
  const source = value || defaultPhonicsSounds;
  const categories = Array.isArray(source.categories) && source.categories.length ? source.categories : defaultPhonicsSounds.categories;
  const items = Array.isArray(source.items) && source.items.length ? source.items : defaultPhonicsSounds.items;
  return {
    categories: categories.map((cat, index) => ({
      id: cat.id || `category-${index + 1}`,
      title: cat.title || 'Sound Category',
      zh: cat.zh || '',
      color: cat.color || 'teal',
      order: Number(cat.order || index + 1),
      enabled: cat.enabled !== false,
    })).sort((a, b) => a.order - b.order),
    items: items.map((item, index) => ({
      id: item.id || `sound-${index + 1}-${slug(item.phoneme)}`,
      categoryId: item.categoryId || categories[0]?.id || 'short-vowels',
      phoneme: item.phoneme || 'a',
      symbol: item.symbol || '/?/',
      sayAs: item.sayAs || item.phoneme || '',
      relatedWords: Array.isArray(item.relatedWords) ? item.relatedWords : [],
      highlight: item.highlight || item.phoneme || '',
      enabled: item.enabled !== false,
      unitIds: Array.isArray(item.unitIds) ? item.unitIds : [],
      audioUrl: item.audioUrl || '',
      audioPath: item.audioPath || '',
    })),
  };
}

function normalizeContent(content) {
  const merged = mergeSiteContent(content);
  return {
    ...merged,
    version: merged.version || APP_VERSION,
    units: (merged.units || []).map(normalizeUnit),
    games: [{ id: 'phoneme-listening-choice', title: 'Phoneme Quest', zh: '聽音素選音素', icon: '🎧', skill: '聽音素發音選擇對應音素', type: 'phoneme-choice' }],
    phonicsSounds: normalizePhonicsSounds(merged.phonicsSounds),
    audioLibrary: {
      letters: {},
      sounds: {},
      words: {},
      phrases: {},
      ...(merged.audioLibrary || {}),
    },
    aiSettings: {
      enabled: true,
      mode: 'local',
      ...(merged.aiSettings || {}),
    },
  };
}

function getEnabledUnitItems(unit) {
  return (unit?.items || []).filter((item) => item.enabled !== false);
}

function getUnitWords(unit) {
  const itemWords = getEnabledUnitItems(unit).flatMap((item) => item.words || []);
  return [...new Set([...(unit?.words || []), ...itemWords].filter(Boolean))];
}

function getUnitPatterns(unit) {
  const itemPatterns = getEnabledUnitItems(unit).flatMap((item) => item.patterns || []);
  return [...new Set([...(unit?.patterns || []), ...itemPatterns].filter(Boolean))];
}

function getScopeSounds(phonicsSounds, scope, selectedUnitId) {
  const sounds = normalizePhonicsSounds(phonicsSounds);
  return sounds.items.filter((item) => item.enabled !== false && (scope === 'all' || item.unitIds?.includes(selectedUnitId)));
}

function expectedAudioItems(content, category, scope = 'all', unitId = '') {
  const values = new Map();
  const units = (content.units || []).filter((unit) => scope === 'all' || unit.id === unitId);

  if (category === 'sounds') {
    getScopeSounds(content.phonicsSounds, scope, unitId).forEach((item) => {
      values.set(item.id, { key: item.id, label: `${item.phoneme} ${item.symbol}`, unitId: item.unitIds?.[0] || '', item });
    });
  } else if (category === 'letters') {
    const alphabet = content.phonicsSounds.items.filter((item) => item.enabled !== false && /^[a-z]$/i.test(item.phoneme));
    alphabet.forEach((item) => values.set(slug(item.phoneme), { key: slug(item.phoneme), label: `${item.phoneme} ${item.symbol}`, item }));
  } else if (category === 'words') {
    units.flatMap(getUnitWords).forEach((word) => values.set(slug(word), { key: slug(word), label: word }));
    getScopeSounds(content.phonicsSounds, scope, unitId).flatMap((item) => item.relatedWords || []).forEach((word) => values.set(slug(word), { key: slug(word), label: word }));
  } else {
    (content.stories || []).forEach((story) => values.set(slug(story.title), { key: slug(story.title), label: story.title }));
  }
  return [...values.values()];
}

function getAudioFromLibrary(library, category, keys) {
  const store = library?.[category] || {};
  for (const key of keys.map(slug).filter(Boolean)) {
    const item = store[key] || store[String(key).toLowerCase()];
    if (item) return typeof item === 'string' ? { url: item } : item;
  }
  return null;
}

function playUrl(url) {
  const audio = new Audio(url);
  return audio.play();
}

function playPhoneme(item, content, includeWord = false) {
  const keys = [item.id, item.phoneme, item.highlight, slug(item.phoneme)];
  const audio = getAudioFromLibrary(content.audioLibrary, 'sounds', keys) || (item.audioUrl ? { url: item.audioUrl } : null);
  const url = audio?.url || audio?.dataUrl;
  if (url) {
    playUrl(url).catch(() => speakText(item.sayAs || item.phoneme));
    return;
  }
  const knownKey = slug(item.phoneme);
  if (knownKey) {
    speakPhonicsSound(knownKey, includeWord);
  } else {
    speakText(item.sayAs || item.phoneme);
  }
}

function highlightWord(word, item) {
  const raw = String(word || '');
  const patterns = String(item.highlight || item.phoneme || '').split('|').map((part) => part.trim()).filter(Boolean);
  const pattern = patterns.find((part) => raw.toLowerCase().includes(part.toLowerCase()));
  if (!pattern) return raw;
  const index = raw.toLowerCase().indexOf(pattern.toLowerCase());
  return <>{raw.slice(0, index)}<mark>{raw.slice(index, index + pattern.length)}</mark>{raw.slice(index + pattern.length)}</>;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function UserMenu({ user, isAdmin, isTeacher, onAuth, onSignOut, message }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      const nextUser = mode === 'signup' ? await signUp(email, password) : await signIn(email, password);
      await onAuth(nextUser, `${mode === 'signup' ? '註冊' : '登入'}成功`);
      setOpen(false);
    } catch (error) {
      onAuth(null, error.message || '登入失敗');
    }
  }

  return (
    <div className="user-menu">
      {user ? (
        <button className="user-chip" onClick={() => setOpen((value) => !value)}>👤 {user.email?.split('@')[0] || 'student'}</button>
      ) : (
        <button className="btn secondary small" onClick={() => setOpen((value) => !value)}>登入 / 註冊</button>
      )}
      {open && (
        <div className="dropdown-card">
          {user ? (
            <>
              <strong>{user.email}</strong>
              <p className="hint">{isAdmin ? '管理員' : isTeacher ? '教師' : '學生'} · {user.provider || 'local'}</p>
              <p>{message}</p>
              <button className="btn dark full" onClick={onSignOut}>登出</button>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="auth-tabs">
                <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>登入</button>
                <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>註冊</button>
              </div>
              <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
              <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
              <button className="btn dark full" type="submit">{mode === 'signin' ? '登入' : '註冊'}</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function Hero({ content, progress, totalUnits, setTab }) {
  const completed = Object.keys(progress.completedUnits || {}).length;
  const percent = totalUnits ? Math.round((completed / totalUnits) * 100) : 0;
  return (
    <section className="hero-card">
      <div className="hero-main">
        <p className="mission-line">{content.hero?.mission || '✨ 今日任務：完成 10 題音素練習'}</p>
        <h1>{content.hero?.title || 'Phonics Island / 自然發音島'} <span className="version-pill">版本 {content.version || APP_VERSION}</span></h1>
        <p>{content.hero?.subtitle}</p>
        <div className="hero-buttons">
          <button className="btn primary" onClick={() => setTab('sounds')}>音素學習</button>
          <button className="btn secondary" onClick={() => setTab('map')}>學習地圖</button>
          <button className="btn pink" onClick={() => setTab('games')}>玩遊戲</button>
          <button className="btn orange" onClick={() => setTab('progress')}>我的進度</button>
        </div>
      </div>
      <div className="hero-stats">
        <div className="progress-ring"><strong>{percent}%</strong><span>完成</span></div>
        <p>{completed} 已完成單元</p>
        <p>{progress.streakDays || 0} 連續學習天數</p>
        <p>{progress.mistakes?.length || 0} 錯題待複習</p>
      </div>
    </section>
  );
}

function MapView({ units, progress, selectedUnitId, setSelectedUnitId, setTab, search, setSearch }) {
  const filtered = units.filter((unit) => unit.enabled !== false).filter((unit) => {
    const text = `${unit.title} ${unit.zh} ${unit.description} ${getUnitPatterns(unit).join(' ')}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });
  return (
    <section className="map-section">
      <div className="section-heading">
        <div><h2>Phonics Learning Map</h2><p>點選單元後，可到「音素」頁或「遊戲」頁按單元練習。</p></div>
        <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 ai, sh, Magic E..." />
      </div>
      <div className="unit-grid">
        {filtered.map((unit) => (
          <button key={unit.id} className={`unit-card ${unit.theme} ${selectedUnitId === unit.id ? 'selected' : ''}`} onClick={() => { setSelectedUnitId(unit.id); setTab('sounds'); }}>
            <div className="unit-top"><span className="unit-icon">{unit.icon}</span><span className="level-pill">Level {unit.level}</span></div>
            <h3>{unit.title}</h3>
            <p className="unit-zh">{unit.zh}</p>
            <p>{unit.description}</p>
            <div className="chips">{getUnitPatterns(unit).slice(0, 4).map((p) => <span key={p}>{p}</span>)}</div>
            {progress.completedUnits?.[unit.id] ? <div className="complete-mark">✓ 已完成</div> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function PhonicsSoundsView({ content, selectedUnitId, units, onPractice }) {
  const [categoryId, setCategoryId] = useState('all');
  const [scope, setScope] = useState('all');
  const sounds = normalizePhonicsSounds(content.phonicsSounds);
  const visibleItems = sounds.items.filter((item) => item.enabled !== false)
    .filter((item) => categoryId === 'all' || item.categoryId === categoryId)
    .filter((item) => scope === 'all' || item.unitIds?.includes(selectedUnitId));
  const activeCategories = sounds.categories.filter((cat) => cat.enabled !== false);

  return (
    <section className="sounds-page">
      <div className="section-heading sounds-hero">
        <div>
          <p className="mini-label">Phonics Sounds / Phonemes 音素</p>
          <h2><span>{visibleItems.length}</span> Phonics Sound Cards</h2>
          <p>選擇分類或全部顯示。點擊卡片的喇叭會優先播放後台上傳的真人音檔。</p>
        </div>
        <div className="sounds-controls">
          <label>分類
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="all">顯示所有</option>
              {activeCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.title} / {cat.zh}</option>)}
            </select>
          </label>
          <label>範圍
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">全部單元</option>
              <option value="unit">目前單元：{units.find((unit) => unit.id === selectedUnitId)?.zh}</option>
            </select>
          </label>
        </div>
      </div>
      <div className="sound-category-strip">
        <button className={categoryId === 'all' ? 'active-chip' : ''} onClick={() => setCategoryId('all')}>全部</button>
        {activeCategories.map((cat) => {
          const count = sounds.items.filter((item) => item.enabled !== false && item.categoryId === cat.id).length;
          return <button key={cat.id} className={`cat-${cat.color} ${categoryId === cat.id ? 'active-chip' : ''}`} onClick={() => setCategoryId(cat.id)}><strong>{count}</strong> {cat.title}<span>{cat.zh}</span></button>;
        })}
      </div>
      <div className="phoneme-card-grid">
        {visibleItems.map((item) => (
          <article className={`phoneme-card cat-${sounds.categories.find((cat) => cat.id === item.categoryId)?.color || 'teal'}`} key={item.id}>
            <button className="phoneme-play" onClick={() => { playPhoneme(item, content, true); onPractice('phonics-sounds', item.phoneme); }}>🔊</button>
            <strong>{item.phoneme}</strong>
            <em>{item.symbol}</em>
            <div className="related-words">
              {(item.relatedWords || []).slice(0, 4).map((word) => <span key={word}>{highlightWord(word, item)}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PhonemeGame({ content, units, selectedUnitId, onPractice, onMistake }) {
  const [scope, setScope] = useState('unit');
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const pool = getScopeSounds(content.phonicsSounds, scope, selectedUnitId);
  const allSounds = getScopeSounds(content.phonicsSounds, 'all', selectedUnitId);
  const current = questions[index];
  const done = started && index >= questions.length;

  function buildQuestionSet() {
    const base = pool.length >= 4 ? pool : allSounds;
    const picked = shuffle(base).slice(0, Math.min(GAME_LENGTH, base.length));
    return picked.map((answer) => {
      const distractors = shuffle(allSounds.filter((item) => item.id !== answer.id)).slice(0, 4);
      return { answer, choices: shuffle([answer, ...distractors]).slice(0, 5) };
    });
  }

  function startGame() {
    const next = buildQuestionSet();
    setQuestions(next);
    setIndex(0);
    setScore(0);
    setFeedback('聽音後，選出正確的音素。');
    setStarted(true);
    window.setTimeout(() => next[0] && playPhoneme(next[0].answer, content, false), 150);
  }

  function leaveGame() {
    setStarted(false);
    setQuestions([]);
    setIndex(0);
    setFeedback('已離開遊戲。');
  }

  function nextQuestion(text = '') {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setFeedback(text);
    window.setTimeout(() => questions[nextIndex] && playPhoneme(questions[nextIndex].answer, content, false), 220);
  }

  function choose(choice) {
    if (!current) return;
    onPractice('phoneme-game', current.answer.phoneme);
    if (choice.id === current.answer.id) {
      setScore((value) => value + 1);
      nextQuestion('答對了！下一題。');
    } else {
      onMistake({ id: `${Date.now()}-${choice.id}`, expected: current.answer.phoneme, expectedLabel: `${current.answer.phoneme} ${current.answer.symbol}`, chosen: choice.phoneme, chosenLabel: `${choice.phoneme} ${choice.symbol}` });
      setFeedback(`再試一次：正確答案是 ${current.answer.phoneme} ${current.answer.symbol}`);
    }
  }

  return (
    <section className="game-page">
      <div className="section-heading sounds-hero">
        <div>
          <p className="mini-label">Game 1</p>
          <h2>🎧 聽音素發音，選擇對應音素</h2>
          <p>一關 10 題。畫面一次只顯示這一個遊戲，適合小學生平板操作。</p>
        </div>
        <div className="sounds-controls">
          <label>練習範圍
            <select value={scope} onChange={(e) => setScope(e.target.value)} disabled={started}>
              <option value="unit">目前單元：{units.find((unit) => unit.id === selectedUnitId)?.zh}</option>
              <option value="all">全部單元</option>
            </select>
          </label>
        </div>
      </div>
      <section className="panel phoneme-game-panel">
        {!started ? (
          <div className="game-start-screen">
            <div className="game-mascot">🦉</div>
            <h3>準備好了嗎？</h3>
            <p>按開始後會播放一個音素音檔，從 4-5 個大音素中選出答案。</p>
            <button className="btn primary big" onClick={startGame} disabled={(pool.length || allSounds.length) < 4}>開始</button>
            {(pool.length || allSounds.length) < 4 ? <p className="hint">此範圍音素不足，請切換到全部單元或在後台增加音素。</p> : null}
          </div>
        ) : done ? (
          <div className="game-start-screen">
            <div className="game-mascot">🎉</div>
            <h3>完成一關！</h3>
            <p>你答對 {score} / {questions.length} 題。</p>
            <div className="hero-buttons compact">
              <button className="btn primary" onClick={startGame}>重新開始</button>
              <button className="btn secondary" onClick={leaveGame}>離開</button>
            </div>
          </div>
        ) : (
          <div className="game-question-screen">
            <div className="game-topline"><span>第 {index + 1} / {questions.length} 題</span><span>答對 {score}</span></div>
            <button className="listen-orb" onClick={() => playPhoneme(current.answer, content, false)}>🔊</button>
            <p className="game-feedback">{feedback || '請選出你聽到的音素。'}</p>
            <div className="phoneme-choice-grid">
              {current.choices.map((choice) => <button key={choice.id} onClick={() => choose(choice)}>{choice.phoneme}</button>)}
            </div>
            <div className="hero-buttons compact game-actions">
              <button className="btn secondary" onClick={() => playPhoneme(current.answer, content, false)}>再聽一次</button>
              <button className="btn orange" onClick={() => nextQuestion('已跳過。')}>跳過</button>
              <button className="btn dark" onClick={leaveGame}>離開</button>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

function ReadView({ stories, onPractice }) {
  return (
    <div className="read-grid">
      <section className="panel">
        <h2>Decodable Readers</h2>
        <p>每個單字都能點擊發音。</p>
        <div className="story-list">
          {stories.map((story) => (
            <article className="story-card" key={story.id || story.title}>
              <div className="story-top"><h3>{story.title}</h3><span>{story.level}</span></div>
              <div className="story-text clickable-story">
                {story.text.split(/(\s+)/).map((token, tokenIndex) => {
                  if (/^\s+$/.test(token)) return token;
                  const clean = token.replace(/[^a-zA-Z]/g, '');
                  return clean ? <button key={`${token}-${tokenIndex}`} onClick={() => { speakWord(clean); onPractice('reader', clean); }}>{token}</button> : token;
                })}
              </div>
              <div className="chips large">{(story.focus || []).map((word) => <button key={word} onClick={() => { speakWord(word); onPractice('reader', word); }}>{word} 🔊</button>)}</div>
              <button className="btn primary" onClick={() => { speakText(story.text); onPractice('reader', story.title); }}>朗讀全文</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgressView({ progress, units, onClearMistakes }) {
  const completedIds = Object.keys(progress.completedUnits || {});
  return (
    <div className="progress-grid">
      <section className="panel passport-panel">
        <div className="section-title-row"><div><h2>我的 Phonics Passport</h2><p>學習進度、星星、錯題都在這裡。</p></div><span className="big-emoji">🛂</span></div>
        <div className="passport-grid">
          <div><strong>{completedIds.length}</strong><span>已完成單元</span></div>
          <div><strong>{progress.stars}</strong><span>星星數</span></div>
          <div><strong>{progress.streakDays}</strong><span>連續學習天數</span></div>
          <div><strong>{progress.practiceCount}</strong><span>練習次數</span></div>
        </div>
      </section>
      <section className="panel">
        <h2>學習報告</h2>
        <div className="report-list">
          {units.map((unit) => {
            const done = Boolean(progress.completedUnits?.[unit.id]);
            return <div className="report-row" key={unit.id}><div><strong>{unit.zh}</strong><span>{done ? '已完成' : '學習中'}</span></div><div className="bar"><span style={{ width: done ? '100%' : '25%' }} /></div></div>;
          })}
        </div>
      </section>
      <section className="panel mistake-panel">
        <div className="section-title-row"><div><h2>錯題本</h2><p>答錯的聲音會出現在這裡。</p></div><button className="btn secondary" onClick={onClearMistakes}>清空錯題</button></div>
        {progress.mistakes?.length ? progress.mistakes.slice(-8).reverse().map((item) => (
          <div className="mistake-item" key={item.id}><button onClick={() => speakPhonicsSound(item.expected, true)}>🔊</button><div><strong>{item.expectedLabel || item.expected}</strong><span>誤選：{item.chosenLabel || item.chosen}</span></div></div>
        )) : <p className="hint">目前沒有錯題。</p>}
      </section>
    </div>
  );
}

function UnitAdmin({ content, setContent }) {
  const [unitId, setUnitId] = useState(content.units[0]?.id || '');
  const unitIndex = Math.max(0, content.units.findIndex((unit) => unit.id === unitId));
  const unit = content.units[unitIndex] || content.units[0];
  const [selectedItemId, setSelectedItemId] = useState(unit?.items?.[0]?.id || '');
  const selectedItem = (unit?.items || []).find((item) => item.id === selectedItemId) || unit?.items?.[0];

  useEffect(() => {
    if (!content.units.find((unitItem) => unitItem.id === unitId)) setUnitId(content.units[0]?.id || '');
  }, [content.units.length, unitId, content.units]);

  function updateUnit(patch) {
    const next = clone(content);
    next.units[unitIndex] = normalizeUnit({ ...next.units[unitIndex], ...patch });
    setContent(next);
  }

  function addUnit() {
    const next = clone(content);
    const id = `unit-${Date.now()}`;
    next.units.push(normalizeUnit({ id, level: next.units.length + 1, enabled: true, icon: '✨', theme: 'pink', title: 'New Unit', zh: '新單元', description: '請編輯單元內容', patterns: [], words: [], blendingSet: [], magicEPairs: [], storyTitle: content.stories[0]?.title || '', items: [] }));
    setContent(next);
    setUnitId(id);
  }

  function deleteUnit() {
    if (content.units.length <= 1) return;
    const next = clone(content);
    next.units.splice(unitIndex, 1);
    setContent(next);
    setUnitId(next.units[0]?.id || '');
  }

  function addItem(type = 'pattern') {
    const label = type === 'word' ? 'new word' : 'new sound';
    const nextItems = [...(unit.items || []), { id: `${unit.id}-${type}-${Date.now()}`, type, label, enabled: true, patterns: type === 'word' ? [] : [label], words: type === 'word' ? [label] : [], storyTitle: unit.storyTitle || '' }];
    updateUnit({ items: nextItems });
    window.setTimeout(() => setSelectedItemId(nextItems[nextItems.length - 1].id), 0);
  }

  function updateItem(patch) {
    if (!selectedItem) return;
    const items = (unit.items || []).map((item) => item.id === selectedItem.id ? { ...item, ...patch } : item);
    updateUnit({ items });
  }

  function deleteItem(id) {
    const items = (unit.items || []).filter((item) => item.id !== id);
    updateUnit({ items });
    setSelectedItemId(items[0]?.id || '');
  }

  function syncItemsToUnit() {
    const enabled = getEnabledUnitItems(unit);
    updateUnit({ patterns: [...new Set(enabled.flatMap((item) => item.patterns || []).filter(Boolean))], words: [...new Set(enabled.flatMap((item) => item.words || []).filter(Boolean))] });
  }

  if (!unit) return <p>沒有單元。</p>;

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <label>選擇單元<select value={unit.id} onChange={(e) => { setUnitId(e.target.value); setSelectedItemId(''); }}>{content.units.map((u) => <option key={u.id} value={u.id}>{u.level}. {u.zh} / {u.title}</option>)}</select></label>
        <button className="btn secondary" onClick={addUnit}>新增單元</button>
        <button className="btn danger" onClick={deleteUnit}>刪除單元</button>
        <button className="btn primary" onClick={syncItemsToUnit}>同步啟用項目</button>
      </div>
      <div className="admin-form-grid">
        <label>啟用狀態<select value={unit.enabled === false ? 'off' : 'on'} onChange={(e) => updateUnit({ enabled: e.target.value === 'on' })}><option value="on">啟用</option><option value="off">停用</option></select></label>
        <label>id<input value={unit.id} onChange={(e) => updateUnit({ id: e.target.value })} /></label>
        <label>level<input type="number" value={unit.level} onChange={(e) => updateUnit({ level: Number(e.target.value) || 1 })} /></label>
        <label>icon<input value={unit.icon} onChange={(e) => updateUnit({ icon: e.target.value })} /></label>
        <label>英文標題<input value={unit.title} onChange={(e) => updateUnit({ title: e.target.value })} /></label>
        <label>中文標題<input value={unit.zh} onChange={(e) => updateUnit({ zh: e.target.value })} /></label>
        <label>描述<textarea rows="3" value={unit.description} onChange={(e) => updateUnit({ description: e.target.value })} /></label>
        <label>patterns<textarea rows="4" value={(unit.patterns || []).join('\n')} onChange={(e) => updateUnit({ patterns: splitLines(e.target.value) })} /></label>
        <label>words<textarea rows="4" value={(unit.words || []).join('\n')} onChange={(e) => updateUnit({ words: splitLines(e.target.value) })} /></label>
        <label>Magic E pairs<textarea rows="4" value={pairsToText(unit.magicEPairs)} onChange={(e) => updateUnit({ magicEPairs: pairLinesToArray(e.target.value) })} placeholder="cap|cape" /></label>
      </div>
      <div className="admin-split">
        <div className="admin-list-panel">
          <div className="admin-toolbar compact"><button className="btn secondary small" onClick={() => addItem('pattern')}>新增 pattern</button><button className="btn secondary small" onClick={() => addItem('word')}>新增 word</button></div>
          {(unit.items || []).map((item) => <button key={item.id} className={`admin-list-item ${selectedItem?.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedItemId(item.id)}><strong>{item.label}</strong><span>{item.enabled === false ? '停用' : '啟用'} · {item.type}</span></button>)}
        </div>
        {selectedItem ? (
          <div className="admin-editor-panel">
            <div className="section-title-row"><h3>直接編輯項目</h3><button className="btn danger small" onClick={() => deleteItem(selectedItem.id)}>刪除</button></div>
            <div className="admin-form-grid single">
              <label>啟用<select value={selectedItem.enabled === false ? 'off' : 'on'} onChange={(e) => updateItem({ enabled: e.target.value === 'on' })}><option value="on">啟用</option><option value="off">停用</option></select></label>
              <label>類型<select value={selectedItem.type} onChange={(e) => updateItem({ type: e.target.value })}><option value="letter">letter sound</option><option value="pattern">pattern</option><option value="word">word</option></select></label>
              <label>label<input value={selectedItem.label} onChange={(e) => updateItem({ label: e.target.value })} /></label>
              <label>patterns<textarea rows="4" value={(selectedItem.patterns || []).join('\n')} onChange={(e) => updateItem({ patterns: splitLines(e.target.value) })} /></label>
              <label>words<textarea rows="4" value={(selectedItem.words || []).join('\n')} onChange={(e) => updateItem({ words: splitLines(e.target.value) })} /></label>
              <label>storyTitle<input value={selectedItem.storyTitle || ''} onChange={(e) => updateItem({ storyTitle: e.target.value })} /></label>
            </div>
          </div>
        ) : <div className="admin-editor-panel"><p>請選擇一個項目。</p></div>}
      </div>
    </div>
  );
}

function PhonicsSoundsAdmin({ content, setContent }) {
  const sounds = normalizePhonicsSounds(content.phonicsSounds);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const filtered = sounds.items.filter((item) => categoryFilter === 'all' || item.categoryId === categoryFilter);
  const [selectedId, setSelectedId] = useState(filtered[0]?.id || '');
  const selected = sounds.items.find((item) => item.id === selectedId) || filtered[0] || sounds.items[0];
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!filtered.find((item) => item.id === selectedId)) setSelectedId(filtered[0]?.id || sounds.items[0]?.id || '');
  }, [categoryFilter, content.phonicsSounds.items.length]);

  function updateSounds(nextSounds) {
    setContent({ ...content, phonicsSounds: normalizePhonicsSounds(nextSounds) });
  }

  function updateCategory(categoryId, patch) {
    updateSounds({ ...sounds, categories: sounds.categories.map((cat) => cat.id === categoryId ? { ...cat, ...patch } : cat) });
  }

  function addCategory() {
    const id = `category-${Date.now()}`;
    updateSounds({ ...sounds, categories: [...sounds.categories, { id, title: 'New Sound Category', zh: '新分類', color: 'teal', order: sounds.categories.length + 1, enabled: true }] });
    setCategoryFilter(id);
  }

  function addSound() {
    const id = `sound-${Date.now()}`;
    const categoryId = categoryFilter === 'all' ? sounds.categories[0]?.id : categoryFilter;
    updateSounds({ ...sounds, items: [...sounds.items, { id, categoryId, phoneme: 'new', symbol: '/?/', sayAs: 'new sound', relatedWords: [], highlight: 'new', enabled: true, unitIds: [] }] });
    setSelectedId(id);
  }

  function updateSound(patch) {
    updateSounds({ ...sounds, items: sounds.items.map((item) => item.id === selected.id ? { ...item, ...patch } : item) });
  }

  function deleteSound() {
    updateSounds({ ...sounds, items: sounds.items.filter((item) => item.id !== selected.id) });
    setSelectedId(filtered[0]?.id || '');
  }

  async function uploadSoundAudio(file) {
    if (!file || !selected) return;
    setUploading(true);
    try {
      const uploaded = await uploadManagedAudio({ category: 'sounds', key: selected.id, itemId: selected.id, file });
      const next = clone(content);
      next.audioLibrary = next.audioLibrary || { letters: {}, sounds: {}, words: {}, phrases: {} };
      next.audioLibrary.sounds = next.audioLibrary.sounds || {};
      next.audioLibrary.sounds[slug(selected.id)] = uploaded;
      next.audioLibrary.sounds[slug(selected.phoneme)] = uploaded;
      next.phonicsSounds = normalizePhonicsSounds({ ...sounds, items: sounds.items.map((item) => item.id === selected.id ? { ...item, audioUrl: uploaded.url || uploaded.dataUrl || '', audioPath: uploaded.path || '' } : item) });
      setContent(next);
      await saveSiteContent(next);
      setAudioLibrary(next.audioLibrary);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <label>分類<select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">顯示所有</option>{sounds.categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.title} / {cat.zh}</option>)}</select></label>
        <button className="btn secondary" onClick={addCategory}>新增分類</button>
        <button className="btn secondary" onClick={addSound}>新增音素</button>
      </div>
      {categoryFilter !== 'all' ? (
        <div className="admin-form-grid">
          {sounds.categories.filter((cat) => cat.id === categoryFilter).map((cat) => (
            <div className="admin-form-grid" key={cat.id}>
              <label>分類 ID<input value={cat.id} onChange={(e) => updateCategory(cat.id, { id: e.target.value })} /></label>
              <label>英文分類<input value={cat.title} onChange={(e) => updateCategory(cat.id, { title: e.target.value })} /></label>
              <label>中文分類<input value={cat.zh} onChange={(e) => updateCategory(cat.id, { zh: e.target.value })} /></label>
              <label>顏色<select value={cat.color} onChange={(e) => updateCategory(cat.id, { color: e.target.value })}><option value="pink">pink</option><option value="rose">rose</option><option value="coral">coral</option><option value="magenta">magenta</option><option value="teal">teal</option><option value="green">green</option></select></label>
            </div>
          ))}
        </div>
      ) : null}
      <div className="admin-split">
        <div className="admin-list-panel">
          {filtered.map((item) => <button key={item.id} className={`admin-list-item ${selected?.id === item.id ? 'selected' : ''}`} onClick={() => setSelectedId(item.id)}><strong>{item.phoneme} {item.symbol}</strong><span>{item.enabled === false ? '停用' : '啟用'} · {item.relatedWords?.slice(0, 3).join(', ')}</span></button>)}
        </div>
        {selected ? (
          <div className="admin-editor-panel">
            <div className="section-title-row"><h3>音素內容管理</h3><button className="btn danger small" onClick={deleteSound}>刪除音素</button></div>
            <div className="admin-form-grid single">
              <label>停啟用<select value={selected.enabled === false ? 'off' : 'on'} onChange={(e) => updateSound({ enabled: e.target.value === 'on' })}><option value="on">啟用</option><option value="off">停用</option></select></label>
              <label>分類<select value={selected.categoryId} onChange={(e) => updateSound({ categoryId: e.target.value })}>{sounds.categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.title}</option>)}</select></label>
              <label>音素<input value={selected.phoneme} onChange={(e) => updateSound({ phoneme: e.target.value })} /></label>
              <label>音素符號<input value={selected.symbol} onChange={(e) => updateSound({ symbol: e.target.value })} /></label>
              <label>音素發音文字<input value={selected.sayAs} onChange={(e) => updateSound({ sayAs: e.target.value })} /></label>
              <label>高亮字母<input value={selected.highlight} onChange={(e) => updateSound({ highlight: e.target.value })} placeholder="例如 sh 或 s|zh" /></label>
              <label>相關單詞<textarea rows="4" value={(selected.relatedWords || []).join('\n')} onChange={(e) => updateSound({ relatedWords: splitLines(e.target.value) })} /></label>
              <label>關聯單元 ID<textarea rows="3" value={(selected.unitIds || []).join('\n')} onChange={(e) => updateSound({ unitIds: splitLines(e.target.value) })} /></label>
              <label>音素音檔 URL<input value={selected.audioUrl || ''} onChange={(e) => updateSound({ audioUrl: e.target.value })} /></label>
              <div className="audio-upload-row"><button className="btn dark" onClick={() => playPhoneme(selected, content, true)}>聆聽</button><label className="btn secondary upload-label">{uploading ? '上傳中...' : '上傳真人音檔'}<input type="file" accept="audio/*" disabled={uploading} onChange={(e) => uploadSoundAudio(e.target.files?.[0])} /></label></div>
            </div>
          </div>
        ) : <div className="admin-editor-panel"><p>請選擇音素。</p></div>}
      </div>
    </div>
  );
}

function AudioAdmin({ content, setContent }) {
  const [scope, setScope] = useState('unit');
  const [unitId, setUnitId] = useState(content.units[0]?.id || '');
  const [category, setCategory] = useState('sounds');
  const [uploadingKey, setUploadingKey] = useState('');
  const status = getAudioStorageStatus();
  const items = expectedAudioItems(content, category, scope, unitId);
  const library = content.audioLibrary?.[category] || {};

  async function uploadAudio(file, target) {
    if (!file || !target) return;
    setUploadingKey(target.key);
    try {
      const uploaded = await uploadManagedAudio({ category, key: target.key, itemId: target.item?.id || target.key, file });
      const next = clone(content);
      next.audioLibrary = next.audioLibrary || { letters: {}, sounds: {}, words: {}, phrases: {} };
      next.audioLibrary[category] = next.audioLibrary[category] || {};
      next.audioLibrary[category][slug(target.key)] = uploaded;
      if (category === 'sounds' && target.item?.phoneme) next.audioLibrary[category][slug(target.item.phoneme)] = uploaded;
      setContent(next);
      setAudioLibrary(next.audioLibrary);
      await saveSiteContent(next);
    } finally {
      setUploadingKey('');
    }
  }

  function playAudio(target) {
    const audio = library[slug(target.key)] || library[target.key] || (target.item ? getAudioFromLibrary(content.audioLibrary, 'sounds', [target.item.id, target.item.phoneme]) : null);
    if (audio?.dataUrl || audio?.url) {
      playUrl(audio.dataUrl || audio.url).catch(() => {});
      return;
    }
    if (category === 'words') speakWord(target.key);
    else if (category === 'sounds' && target.item) playPhoneme(target.item, content, true);
    else speakText(target.label);
  }

  return (
    <div className="admin-section">
      <div className="section-title-row"><div><h2>音頻管理 {APP_VERSION}</h2><p>目前儲存：{status.label}。上傳成功後，音檔會保存到 Supabase Storage / Firebase Storage，URL 會自動寫入網站內容。</p></div><span className="big-emoji">🎧</span></div>
      <div className="admin-toolbar">
        <label>上傳範圍<select value={scope} onChange={(e) => setScope(e.target.value)}><option value="unit">按單元上傳</option><option value="all">全部單元上傳</option></select></label>
        <label>單元<select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={scope === 'all'}>{content.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.zh}</option>)}</select></label>
        <label>分類<select value={category} onChange={(e) => setCategory(e.target.value)}>{audioCategories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <button className="btn secondary" onClick={() => downloadJson('phonics-audio-manifest.json', content.audioLibrary || {})}>匯出音檔 manifest</button>
      </div>
      {!status.configured ? <p className="message-strip warning">尚未配置雲端 Storage，會退回本機預覽模式。要跨電腦永久保存，請設定 Supabase 或 Firebase 環境變數與 storage 規則。</p> : null}
      <div className="audio-grid">
        {items.map((item) => {
          const audio = library[slug(item.key)] || library[item.key];
          return (
            <div className="audio-card" key={item.key}>
              <strong>{item.label}</strong><span>{item.key}</span><code>{category}/{item.key}</code>
              <div className="hero-buttons compact"><button className="btn dark small" onClick={() => playAudio(item)}>聆聽</button><label className="btn secondary small upload-label">{uploadingKey === item.key ? '上傳中...' : '上傳音檔'}<input type="file" accept="audio/*" disabled={uploadingKey === item.key} onChange={(e) => uploadAudio(e.target.files?.[0], item)} /></label></div>
              {audio ? <p className="hint">已保存：{audio.name || 'audio'} · {audio.storage || 'storage'} · {audio.updatedAt?.slice(0, 10)}</p> : <p className="hint">尚未上傳</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StoriesAdmin({ content, setContent }) {
  const [index, setIndex] = useState(0);
  const story = content.stories[index] || content.stories[0];
  function updateStory(patch) {
    const next = clone(content);
    next.stories[index] = { ...next.stories[index], ...patch };
    setContent(next);
  }
  function addStory() {
    const next = clone(content);
    next.stories.push({ id: `story-${Date.now()}`, title: 'New Story', level: 'New Level', text: 'Write a story.', focus: [] });
    setContent(next);
    setIndex(next.stories.length - 1);
  }
  if (!story) return <button className="btn secondary" onClick={addStory}>新增故事</button>;
  return (
    <div className="admin-section">
      <div className="admin-toolbar"><select value={index} onChange={(e) => setIndex(Number(e.target.value))}>{content.stories.map((item, idx) => <option key={item.id || item.title} value={idx}>{item.title}</option>)}</select><button className="btn secondary" onClick={addStory}>新增故事</button><button className="btn danger" onClick={() => { const next = clone(content); next.stories.splice(index, 1); setContent(next); setIndex(Math.max(0, index - 1)); }}>刪除故事</button></div>
      <div className="admin-form-grid">
        <label>標題<input value={story.title} onChange={(e) => updateStory({ title: e.target.value })} /></label>
        <label>level<input value={story.level} onChange={(e) => updateStory({ level: e.target.value })} /></label>
        <label>focus words<textarea rows="3" value={(story.focus || []).join('\n')} onChange={(e) => updateStory({ focus: splitLines(e.target.value) })} /></label>
        <label>本文<textarea rows="8" value={story.text} onChange={(e) => updateStory({ text: e.target.value })} /></label>
      </div>
    </div>
  );
}

function SiteAdmin({ content, setContent }) {
  return (
    <div className="admin-form-grid">
      <label>版本號<input value={content.version} onChange={(e) => setContent({ ...content, version: e.target.value })} /></label>
      <label>今日任務<input value={content.hero?.mission || ''} onChange={(e) => setContent({ ...content, hero: { ...content.hero, mission: e.target.value } })} /></label>
      <label>首頁標題<input value={content.hero?.title || ''} onChange={(e) => setContent({ ...content, hero: { ...content.hero, title: e.target.value } })} /></label>
      <label>首頁副標<textarea rows="4" value={content.hero?.subtitle || ''} onChange={(e) => setContent({ ...content, hero: { ...content.hero, subtitle: e.target.value } })} /></label>
      <label>管理員 Email<textarea rows="3" value={(content.adminEmails || []).join('\n')} onChange={(e) => setContent({ ...content, adminEmails: splitLines(e.target.value) })} /></label>
      <label>教師 Email<textarea rows="3" value={(content.teacherEmails || []).join('\n')} onChange={(e) => setContent({ ...content, teacherEmails: splitLines(e.target.value) })} /></label>
    </div>
  );
}

function AdminView({ content, setContent, onSave, onReset }) {
  const [section, setSection] = useState('sounds');
  return (
    <section className="panel admin-panel">
      <div className="section-title-row"><div><h2>管理員後台 {APP_VERSION}</h2><p>可管理音素、分類、單元、音檔、故事與網站文字。</p></div><span className="big-emoji">🛠️</span></div>
      <div className="chips large admin-tabs">{[['sounds', 'Phonics Sounds'], ['audio', '音頻管理'], ['units', '單元管理'], ['stories', '故事管理'], ['site', '網站設定']].map(([key, label]) => <button key={key} className={section === key ? 'active-chip' : ''} onClick={() => setSection(key)}>{label}</button>)}</div>
      {section === 'site' ? <SiteAdmin content={content} setContent={setContent} /> : null}
      {section === 'units' ? <UnitAdmin content={content} setContent={setContent} /> : null}
      {section === 'sounds' ? <PhonicsSoundsAdmin content={content} setContent={setContent} /> : null}
      {section === 'stories' ? <StoriesAdmin content={content} setContent={setContent} /> : null}
      {section === 'audio' ? <AudioAdmin content={content} setContent={setContent} /> : null}
      <div className="hero-buttons compact admin-actions"><button className="btn primary" onClick={onSave}>儲存網站內容</button><button className="btn secondary" onClick={onReset}>重設預設內容</button></div>
    </section>
  );
}

function TeacherView({ content }) {
  const dash = content.teacherDashboard || {};
  return (
    <div className="progress-grid">
      <section className="panel"><h2>教師後台</h2><p>班級：{dash.className}</p><p>{dash.note}</p><div className="chips large">{(dash.assignments || []).map((id) => <span key={id}>{id}</span>)}</div></section>
      <section className="panel"><h2>示範學生名單</h2>{(dash.roster || []).map((student) => <div className="report-row" key={student.email}><div><strong>{student.name}</strong><span>{student.email}</span></div><div>⭐ {student.stars} · 錯題 {student.mistakes}</div></div>)}</section>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('map');
  const [search, setSearch] = useState('');
  const [siteContent, setSiteContent] = useState(normalizeContent(defaultSiteContent));
  const [selectedUnitId, setSelectedUnitId] = useState(defaultSiteContent.units[0].id);
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(defaultProgress);
  const [message, setMessage] = useState('歡迎來到 Phonics Adventure！');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const [content, currentUser, remoteProgress] = await Promise.all([loadSiteContent(), getCurrentUser(), loadProgress()]);
      if (!mounted) return;
      const normalized = normalizeContent(content);
      setSiteContent(normalized);
      setAudioLibrary(normalized.audioLibrary);
      setSelectedUnitId(normalized.units[0]?.id || 'alphabet');
      setUser(currentUser);
      setProgress(mergeProgress(remoteProgress));
      setReady(true);
    }
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => { setAudioLibrary(siteContent.audioLibrary || {}); }, [siteContent.audioLibrary]);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = setTimeout(() => saveProgress(progress).catch(console.warn), 300);
    return () => clearTimeout(timer);
  }, [progress, ready]);

  const units = siteContent.units || [];
  const stories = siteContent.stories || [];
  const admin = isAdminUser(user, siteContent);
  const teacher = isTeacherUser(user, siteContent);

  function handlePractice(skill, word = '') {
    setProgress((prev) => mergeProgress(updatePracticeProgress(prev, skill, word)));
  }

  async function handleAuth(nextUser, text) {
    if (nextUser) setUser(nextUser);
    setMessage(text);
    if (nextUser) {
      const remoteProgress = await loadProgress();
      setProgress(mergeProgress(remoteProgress));
    }
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setMessage('已登出。');
  }

  async function handleSaveContent() {
    const saved = await saveSiteContent(siteContent);
    const normalized = normalizeContent(saved);
    setSiteContent(normalized);
    setAudioLibrary(normalized.audioLibrary);
    setMessage('網站內容已儲存。');
  }

  function handleResetContent() {
    const restored = normalizeContent(resetSiteContent());
    setSiteContent(restored);
    setSelectedUnitId(restored.units[0]?.id || 'alphabet');
    setMessage('已重設為預設內容。');
  }

  const navItems = [
    ['map', '學習地圖'],
    ['sounds', '音素'],
    ['games', '遊戲'],
    ['read', '閱讀'],
    ['progress', '進度'],
    ...(teacher ? [['teacher', '教師']] : []),
    ...(admin ? [['admin', '管理']] : []),
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="logo">🦊</div><div><h1>Phonics Adventure</h1><p>英文自然發音冒險</p></div></div>
        <nav>{navItems.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
        <div className="topbar-right"><UserMenu user={user} isAdmin={admin} isTeacher={teacher} onAuth={handleAuth} onSignOut={handleSignOut} message={message} /><div className="student-pill">⭐ {progress.stars} Stars</div></div>
      </header>
      <main>
        <Hero content={siteContent} progress={progress} totalUnits={units.length} setTab={setTab} />
        <div className="message-strip">{message}</div>
        {tab === 'map' && <MapView units={units} progress={progress} selectedUnitId={selectedUnitId} setSelectedUnitId={setSelectedUnitId} setTab={setTab} search={search} setSearch={setSearch} />}
        {tab === 'sounds' && <PhonicsSoundsView content={siteContent} selectedUnitId={selectedUnitId} units={units} onPractice={handlePractice} />}
        {tab === 'games' && <PhonemeGame content={siteContent} units={units} selectedUnitId={selectedUnitId} onPractice={handlePractice} onMistake={(item) => setProgress((prev) => ({ ...prev, mistakes: [...(prev.mistakes || []), item].slice(-30) }))} />}
        {tab === 'read' && <ReadView stories={stories} onPractice={handlePractice} />}
        {tab === 'progress' && <ProgressView progress={progress} units={units} onClearMistakes={() => setProgress((prev) => ({ ...prev, mistakes: [] }))} />}
        {tab === 'teacher' && teacher && <TeacherView content={siteContent} />}
        {tab === 'admin' && admin && <AdminView content={siteContent} setContent={setSiteContent} onSave={handleSaveContent} onReset={handleResetContent} />}
      </main>
    </div>
  );
}
