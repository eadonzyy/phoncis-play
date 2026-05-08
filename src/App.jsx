
import { useEffect, useMemo, useState } from 'react';
import { alphabetSounds, getSoundEntry, getSoundSymbol } from './data/sounds.js';
import { defaultSiteContent } from './data/defaultContent.js';
import { speakText, speakWord, speakPhonicsSound, speakBlendWord, speakPattern, setAudioLibrary } from './utils/speech.js';
import { getCurrentUser, loadProgress, saveProgress, signIn, signOut, signUp } from './services/syncService.js';
import { isAdminUser, isTeacherUser, loadSiteContent, mergeSiteContent, resetSiteContent, saveSiteContent } from './services/contentService.js';

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
  ['letters', '字母音 letters'],
  ['sounds', '音型 sounds'],
  ['words', '單字 words'],
  ['phrases', '句子 phrases'],
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slug(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function splitLines(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pairsToText(pairs) {
  return (pairs || []).map((pair) => `${pair[0]}|${pair[1]}`).join('\n');
}

function pairLinesToArray(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((pair) => pair[0] && pair[1]);
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
  if (word) practiceWords[word.toLowerCase()] = (practiceWords[word.toLowerCase()] || 0) + 1;

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

function normalizeContent(content) {
  const merged = mergeSiteContent(content);
  return {
    ...merged,
    version: 'v1.5.0',
    units: (merged.units || []).map(normalizeUnit),
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

function getScopeUnits(scope, units, selectedUnitId) {
  if (scope === 'all') return units.filter((unit) => unit.enabled !== false);
  return units.filter((unit) => unit.id === selectedUnitId && unit.enabled !== false);
}

function expectedAudioItems(units, category) {
  const values = new Map();
  for (const unit of units) {
    if (category === 'letters') {
      if (unit.id === 'alphabet') {
        alphabetSounds.forEach((item) => values.set(item.key, { key: item.key, label: `${item.letter} ${item.symbol}`, unitId: unit.id }));
      }
      getEnabledUnitItems(unit)
        .filter((item) => item.type === 'letter' || /^[a-z]$/i.test(item.label))
        .forEach((item) => values.set(slug(item.label), { key: slug(item.label), label: item.label, unitId: unit.id }));
    } else if (category === 'sounds') {
      getUnitPatterns(unit).forEach((pattern) => {
        const key = slug(String(pattern).split(/[:\s/]/)[0].replace('→', ''));
        if (key) values.set(key, { key, label: pattern, unitId: unit.id });
      });
    } else if (category === 'words') {
      getUnitWords(unit).forEach((word) => values.set(slug(word), { key: slug(word), label: word, unitId: unit.id }));
    } else {
      values.set(slug(unit.storyTitle || unit.title), { key: slug(unit.storyTitle || unit.title), label: unit.storyTitle || unit.title, unitId: unit.id });
    }
  }
  return [...values.values()];
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
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
        <button className="user-chip" onClick={() => setOpen((v) => !v)}>
          👤 {user.email?.split('@')[0] || 'student'}
        </button>
      ) : (
        <button className="btn secondary small" onClick={() => setOpen((v) => !v)}>登入 / 註冊</button>
      )}

      {open && (
        <div className="dropdown-card">
          {user ? (
            <>
              <p><strong>{user.email}</strong></p>
              <p className="hint">{isAdmin ? '管理員' : isTeacher ? '教師' : '學生'} · {message}</p>
              <button className="btn secondary full" onClick={() => { onSignOut(); setOpen(false); }}>登出</button>
            </>
          ) : (
            <form className="auth-mini-form" onSubmit={submit}>
              <div className="toggle-row">
                <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>登入</button>
                <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>註冊</button>
              </div>
              <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
              <button className="btn dark full">{mode === 'signup' ? '註冊' : '登入'}</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function Hero({ content, progress, totalUnits, setTab }) {
  const percent = Math.round((Object.keys(progress.completedUnits || {}).length / Math.max(totalUnits, 1)) * 100);
  return (
    <section className="hero compact-hero">
      <div className="hero-copy">
        <div className="hero-topline">
          <span className="notice">{content.hero?.mission}</span>
          <span className="version-pill">版本 {content.version}</span>
        </div>
        <h2>{content.hero?.title}</h2>
        <p>{content.hero?.subtitle}</p>
        <div className="hero-buttons four">
          <button className="btn dark" onClick={() => setTab('learn')}>開始學習</button>
          <button className="btn secondary" onClick={() => setTab('map')}>學習地圖</button>
          <button className="btn pink" onClick={() => setTab('games')}>玩遊戲</button>
          <button className="btn primary" onClick={() => setTab('progress')}>我的進度</button>
        </div>
      </div>
      <div className="hero-side compact">
        <div className="progress-circle" style={{ background: `conic-gradient(#f59e0b ${percent * 3.6}deg, #fff7ed 0deg)` }}>
          <div><strong>{percent}%</strong><span>完成</span></div>
        </div>
        <div className="summary-card"><strong>{Object.keys(progress.completedUnits || {}).length}</strong><span>已完成單元</span></div>
        <div className="summary-card"><strong>{progress.streakDays || 0}</strong><span>連續學習天數</span></div>
        <div className="summary-card"><strong>{progress.mistakes?.length || 0}</strong><span>錯題待複習</span></div>
      </div>
    </section>
  );
}

function MapView({ units, progress, selectedUnitId, setSelectedUnitId, setTab, search, setSearch }) {
  const filtered = units.filter((unit) => {
    const q = search.trim().toLowerCase();
    if (!q) return unit.enabled !== false;
    return unit.enabled !== false && [unit.title, unit.zh, unit.description, ...(unit.patterns || []), ...(unit.words || [])].join(' ').toLowerCase().includes(q);
  });

  return (
    <section className="map-view">
      <div className="section-heading">
        <div>
          <h2>學習地圖</h2>
          <p>可由後台自由新增、停用、刪除與編輯每個 phonics 單元。</p>
        </div>
        <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 ai, sh, Magic E..." />
      </div>
      <div className="unit-grid">
        {filtered.map((unit) => (
          <button
            key={unit.id}
            className={`unit-card ${unit.theme} ${selectedUnitId === unit.id ? 'selected' : ''}`}
            onClick={() => { setSelectedUnitId(unit.id); setTab('learn'); }}
          >
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

function LetterSoundBoard({ onPractice }) {
  return (
    <section className="panel sound-board-panel">
      <div className="section-title-row">
        <div><h2>Letter Sound Board</h2><p>優先播放後台音檔，沒有音檔則使用瀏覽器語音。</p></div>
        <span className="big-emoji">🔊</span>
      </div>
      <div className="sound-board-grid">
        {alphabetSounds.map((item) => (
          <button key={item.key} className="sound-card" onClick={() => { speakPhonicsSound(item.key, true); onPractice('alphabet', item.example); }}>
            <span className="sound-picture">{item.picture}</span><strong>{item.letter.toLowerCase()}</strong><em>{item.symbol}</em><small>{item.example}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function InteractiveBlender({ unit, onPractice }) {
  const words = unit?.blendingSet?.length ? unit.blendingSet : getUnitWords(unit).slice(0, 6);
  const [word, setWord] = useState(words[0] || 'cat');
  useEffect(() => setWord(words[0] || 'cat'), [unit?.id]);
  return (
    <section className="panel">
      <div className="section-title-row"><div><h2>互動拼讀板</h2><p>跟隨目前單元的 blendingSet 變化。</p></div><span className="big-emoji">🧱</span></div>
      <div className="blender-box">
        {String(word).split('').map((letter, index) => (
          <button className="letter-tile" key={`${letter}-${index}`} onClick={() => { speakPhonicsSound(letter, false); onPractice(unit.id, letter); }}>
            <strong>{letter}</strong><span>{getSoundSymbol(letter)}</span>
          </button>
        ))}
        <span className="arrow">→</span>
        <button className="word-result" onClick={() => { speakBlendWord(word); onPractice(unit.id, word); }}>{word}<span>🔊</span></button>
      </div>
      <div className="chips large">{words.map((item) => <button key={item} onClick={() => setWord(item)}>{item}</button>)}</div>
    </section>
  );
}

function MagicE({ unit, onPractice }) {
  const pairs = unit?.magicEPairs?.length ? unit.magicEPairs : [['cap', 'cape'], ['pin', 'pine']];
  const [index, setIndex] = useState(0);
  const [magic, setMagic] = useState(false);
  useEffect(() => { setIndex(0); setMagic(false); }, [unit?.id]);
  const pair = pairs[index] || pairs[0];
  return (
    <section className="panel magic-panel">
      <div className="section-title-row"><div><h2>Magic E 動畫區</h2><p>跟隨目前單元的 magicEPairs 變化。</p></div><span className="big-emoji">🪄</span></div>
      <div className="magic-stage">
        <div className="magic-card big"><span>{magic ? '✨' : '🔤'}</span><strong>{magic ? pair[1] : pair[0]}</strong></div>
        <button className="btn purple" onClick={() => { const next = !magic; setMagic(next); speakWord(next ? pair[1] : pair[0]); onPractice(unit.id, next ? pair[1] : pair[0]); }}>{magic ? 'Remove e' : 'Add magic e'}</button>
      </div>
      <div className="chips large">{pairs.map((p, i) => <button key={`${p[0]}-${p[1]}`} onClick={() => { setIndex(i); setMagic(false); }}>{p[0]} → {p[1]}</button>)}</div>
    </section>
  );
}

function LearnView({ unit, stories, progress, onPractice, onComplete }) {
  const story = stories.find((item) => item.title === unit.storyTitle) || stories[0];
  const enabledItems = getEnabledUnitItems(unit);
  return (
    <div className="learn-grid">
      <section className={`panel unit-detail ${unit.theme}`}>
        <div className="section-title-row"><div><h2>{unit.title}</h2><p>{unit.zh}</p></div><span className="big-emoji">{unit.icon}</span></div>
        <p className="detail-desc">{unit.description}</p>
        <h3>啟用項目</h3>
        <div className="item-learning-list">
          {enabledItems.slice(0, 16).map((item) => (
            <button key={item.id} onClick={() => { item.type === 'word' ? speakWord(item.label) : speakPattern(item.label); onPractice(unit.id, item.label); }}>
              <strong>{item.label}</strong><span>{item.type}</span>
            </button>
          ))}
        </div>
        <h3>本單元音型</h3>
        <div className="chips large">{getUnitPatterns(unit).map((pattern) => <button key={pattern} onClick={() => { speakPattern(pattern); onPractice(unit.id, pattern); }}>🔊 {pattern}</button>)}</div>
        <h3>單字卡</h3>
        <div className="word-grid">{getUnitWords(unit).map((word) => <button key={word} onClick={() => { speakWord(word); onPractice(unit.id, word); }}>{word}<span>🔊</span></button>)}</div>
      </section>
      <div className="stack">
        {unit.id === 'alphabet' ? <LetterSoundBoard onPractice={onPractice} /> : null}
        <InteractiveBlender unit={unit} onPractice={onPractice} />
        <MagicE unit={unit} onPractice={onPractice} />
        <section className="panel">
          <div className="section-title-row"><div><h2>Read 小故事</h2><p>{story?.title}</p></div><span className="big-emoji">📖</span></div>
          <p className="story-text bridge-story">{story?.text}</p>
          <div className="chips large">{(story?.focus || []).map((word) => <button key={word} onClick={() => { speakWord(word); onPractice('reader', word); }}>{word} 🔊</button>)}</div>
          <button className="btn secondary" onClick={() => { speakText(story?.text || ''); onPractice('reader', story?.title || 'story'); }}>朗讀故事</button>
        </section>
        <section className="panel check-panel">
          <div className="section-title-row"><div><h2>Check 單元檢核</h2><p>完成後取得星星。</p></div><span className="big-emoji">✅</span></div>
          <button className="btn primary full" onClick={() => onComplete(unit.id)}>{progress.completedUnits?.[unit.id] ? '已完成本單元 ⭐' : '完成本單元，獲得星星 ⭐'}</button>
        </section>
      </div>
    </div>
  );
}

function generateAiContent(scopeUnits, prompt = '') {
  const words = scopeUnits.flatMap(getUnitWords).slice(0, 12);
  const patterns = scopeUnits.flatMap(getUnitPatterns).slice(0, 8);
  const safeWords = words.length ? words : ['cat', 'map', 'sun', 'ship'];
  const sentence = `I can read ${safeWords.slice(0, 3).join(', ')}.`;
  const miniStory = `The ${safeWords[0]} can ${safeWords[1] || 'run'}. I see a ${safeWords[2] || 'sun'}. ${sentence}`;
  return [
    `AI 輔助產生內容（本機規則版）`,
    `範圍：${scopeUnits.map((u) => u.zh).join('、') || '全部單元'}`,
    `重點音型：${patterns.join(', ') || '依單元自動選擇'}`,
    `小故事：${miniStory}`,
    `練習題：Which word has the target sound? ${safeWords.slice(0, 4).join(' / ')}`,
    prompt ? `你的提示：${prompt}` : '',
    `若要接真正 AI API，建議使用安全後端 proxy，不要把 API key 放在 GitHub Pages 前端。`,
  ].filter(Boolean).join('\n');
}

function GamesView({ games, units, selectedUnitId, onPractice, onMistake }) {
  const [gameIndex, setGameIndex] = useState(0);
  const [scope, setScope] = useState('unit');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const activeGame = games[gameIndex] || games[0];
  const scopeUnits = getScopeUnits(scope, units, selectedUnitId);
  const words = scopeUnits.flatMap(getUnitWords);
  const patterns = scopeUnits.flatMap(getUnitPatterns);

  function playGameItem(word) {
    speakWord(word);
    onPractice(activeGame.id, word);
  }

  return (
    <section>
      <div className="section-heading simple"><div><h2>遊戲練習區</h2><p>每個遊戲可以選擇目前單元或全部單元，並加入 AI 輔助產生題目。</p></div></div>
      <section className="panel active-game-panel">
        <div className="section-title-row">
          <div><h2>{activeGame.icon} {activeGame.title}</h2><p>{activeGame.zh} · {activeGame.skill}</p></div>
          <div className="game-nav-inline">
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="unit">目前單元</option>
              <option value="all">全部單元</option>
            </select>
            <button className="btn secondary small" onClick={() => setGameIndex((gameIndex + 1) % games.length)}>下一個遊戲</button>
          </div>
        </div>

        <div className="game-stage-box">
          <p><strong>學習範圍：</strong>{scopeUnits.map((u) => u.zh).join('、')}</p>
          <div className="chips large">
            {patterns.slice(0, 10).map((pattern) => <button key={pattern} onClick={() => { speakPattern(pattern); onPractice(activeGame.id, pattern); }}>🔊 {pattern}</button>)}
          </div>
          <div className="option-grid four">
            {words.slice(0, 8).map((word) => <button key={word} onClick={() => playGameItem(word)}>{word}</button>)}
          </div>
          <div className="ai-box">
            <h3>AI 功能：自動產生題目 / 小故事</h3>
            <textarea rows="3" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="例如：幫我用 short a 做 5 題選擇題" />
            <button className="btn primary" onClick={() => setAiOutput(generateAiContent(scopeUnits, aiPrompt))}>生成 AI 練習</button>
            {aiOutput ? <pre className="ai-output">{aiOutput}</pre> : null}
          </div>
        </div>
      </section>
      <div className="chips large game-selector">{games.map((game, index) => <button key={game.id} className={index === gameIndex ? 'active-chip' : ''} onClick={() => setGameIndex(index)}>{game.icon} {game.title}</button>)}</div>
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
                {story.text.split(/(\s+)/).map((token, index) => {
                  if (/^\s+$/.test(token)) return token;
                  const clean = token.replace(/[^a-zA-Z]/g, '');
                  return clean ? <button key={`${token}-${index}`} onClick={() => { speakWord(clean); onPractice('reader', clean); }}>{token}</button> : token;
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
            return (
              <div className="report-row" key={unit.id}>
                <div><strong>{unit.zh}</strong><span>{done ? '已完成' : '學習中'}</span></div>
                <div className="bar"><span style={{ width: done ? '100%' : '25%' }} /></div>
              </div>
            );
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
    if (!content.units.find((unitItem) => unitItem.id === unitId)) {
      setUnitId(content.units[0]?.id || '');
    }
  }, [content.units.length]);

  function updateUnit(patch) {
    const next = clone(content);
    next.units[unitIndex] = normalizeUnit({ ...next.units[unitIndex], ...patch });
    setContent(next);
  }

  function addUnit() {
    const next = clone(content);
    const id = `unit-${Date.now()}`;
    next.units.push(normalizeUnit({
      id,
      level: next.units.length + 1,
      enabled: true,
      icon: '✨',
      theme: 'pink',
      title: 'New Unit',
      zh: '新單元',
      description: '請編輯單元內容',
      patterns: [],
      words: [],
      learnTips: [],
      blendingSet: [],
      magicEPairs: [],
      storyTitle: content.stories[0]?.title || '',
      items: [],
    }));
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
    const nextItems = [...(unit.items || [])];
    const label = type === 'word' ? 'new word' : 'new sound';
    nextItems.push({
      id: `${unit.id}-${type}-${Date.now()}`,
      type,
      label,
      enabled: true,
      patterns: type === 'pattern' || type === 'letter' ? [label] : [],
      words: type === 'word' ? [label] : [],
      storyTitle: unit.storyTitle || '',
    });
    updateUnit({ items: nextItems });
    setTimeout(() => setSelectedItemId(nextItems[nextItems.length - 1].id), 0);
  }

  function updateItem(patch) {
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
    updateUnit({
      patterns: [...new Set(enabled.flatMap((item) => item.patterns || []).filter(Boolean))],
      words: [...new Set(enabled.flatMap((item) => item.words || []).filter(Boolean))],
    });
  }

  if (!unit) return <p>沒有單元。</p>;

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <label>選擇單元
          <select value={unit.id} onChange={(e) => { setUnitId(e.target.value); setSelectedItemId(''); }}>
            {content.units.map((u) => <option key={u.id} value={u.id}>{u.level}. {u.zh} / {u.title}</option>)}
          </select>
        </label>
        <button className="btn secondary" onClick={addUnit}>新增單元</button>
        <button className="btn danger" onClick={deleteUnit}>刪除單元</button>
        <button className="btn primary" onClick={syncItemsToUnit}>把啟用項目同步到 patterns / words</button>
      </div>

      <div className="admin-form-grid">
        <label>啟用狀態
          <select value={unit.enabled === false ? 'off' : 'on'} onChange={(e) => updateUnit({ enabled: e.target.value === 'on' })}>
            <option value="on">啟用</option>
            <option value="off">停用</option>
          </select>
        </label>
        <label>id<input value={unit.id} onChange={(e) => updateUnit({ id: e.target.value })} /></label>
        <label>level<input type="number" value={unit.level} onChange={(e) => updateUnit({ level: Number(e.target.value) || 1 })} /></label>
        <label>icon<input value={unit.icon} onChange={(e) => updateUnit({ icon: e.target.value })} /></label>
        <label>英文標題<input value={unit.title} onChange={(e) => updateUnit({ title: e.target.value })} /></label>
        <label>中文標題<input value={unit.zh} onChange={(e) => updateUnit({ zh: e.target.value })} /></label>
        <label>描述<textarea rows="3" value={unit.description} onChange={(e) => updateUnit({ description: e.target.value })} /></label>
        <label>storyTitle<input value={unit.storyTitle || ''} onChange={(e) => updateUnit({ storyTitle: e.target.value })} /></label>
        <label>blendingSet<textarea rows="3" value={(unit.blendingSet || []).join('\n')} onChange={(e) => updateUnit({ blendingSet: splitLines(e.target.value) })} /></label>
        <label>magicEPairs（cap|cape）<textarea rows="3" value={pairsToText(unit.magicEPairs)} onChange={(e) => updateUnit({ magicEPairs: pairLinesToArray(e.target.value) })} /></label>
      </div>

      <div className="admin-split">
        <div className="admin-list-col">
          <div className="hero-buttons compact">
            <button className="btn secondary" onClick={() => addItem('letter')}>新增 letter sound</button>
            <button className="btn secondary" onClick={() => addItem('pattern')}>新增 pattern</button>
            <button className="btn secondary" onClick={() => addItem('word')}>新增 word</button>
          </div>
          {(unit.items || []).map((item) => (
            <button key={item.id} className={selectedItem?.id === item.id ? 'active-chip item-admin-row' : 'item-admin-row'} onClick={() => setSelectedItemId(item.id)}>
              <strong>{item.enabled === false ? '停用' : '啟用'} · {item.label}</strong>
              <span>{item.type}</span>
            </button>
          ))}
        </div>

        <div className="admin-editor-col">
          {selectedItem ? (
            <div className="admin-form-grid">
              <h3>點擊項目後直接編輯</h3>
              <label>啟用
                <select value={selectedItem.enabled === false ? 'off' : 'on'} onChange={(e) => updateItem({ enabled: e.target.value === 'on' })}>
                  <option value="on">啟用</option>
                  <option value="off">停用</option>
                </select>
              </label>
              <label>類型
                <select value={selectedItem.type} onChange={(e) => updateItem({ type: e.target.value })}>
                  <option value="letter">letter sound</option>
                  <option value="pattern">pattern</option>
                  <option value="word">word</option>
                  <option value="story">story</option>
                </select>
              </label>
              <label>項目名稱 / letter sound<input value={selectedItem.label} onChange={(e) => updateItem({ label: e.target.value })} /></label>
              <label>patterns<textarea rows="4" value={(selectedItem.patterns || []).join('\n')} onChange={(e) => updateItem({ patterns: splitLines(e.target.value) })} /></label>
              <label>words<textarea rows="4" value={(selectedItem.words || []).join('\n')} onChange={(e) => updateItem({ words: splitLines(e.target.value) })} /></label>
              <label>storyTitle<input value={selectedItem.storyTitle || ''} onChange={(e) => updateItem({ storyTitle: e.target.value })} /></label>
              <button className="btn danger" onClick={() => deleteItem(selectedItem.id)}>刪除此項目</button>
            </div>
          ) : <p>請新增或選擇項目。</p>}
        </div>
      </div>
    </div>
  );
}

function AudioAdmin({ content, setContent }) {
  const [scope, setScope] = useState('unit');
  const [unitId, setUnitId] = useState(content.units[0]?.id || '');
  const [category, setCategory] = useState('words');
  const scopeUnits = getScopeUnits(scope, content.units, unitId);
  const items = expectedAudioItems(scopeUnits, category);
  const library = content.audioLibrary?.[category] || {};

  function updateAudioLibrary(nextCategory, key, item) {
    const next = clone(content);
    next.audioLibrary = next.audioLibrary || { letters: {}, sounds: {}, words: {}, phrases: {} };
    next.audioLibrary[nextCategory] = next.audioLibrary[nextCategory] || {};
    next.audioLibrary[nextCategory][key] = item;
    setContent(next);
    setAudioLibrary(next.audioLibrary);
  }

  async function uploadAudio(file, target) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    updateAudioLibrary(category, target.key, {
      dataUrl,
      fileName: file.name,
      key: target.key,
      label: target.label,
      category,
      scope,
      unitIds: scopeUnits.map((unit) => unit.id),
      githubPath: `public/audio/${category}/${target.key}.mp3`,
      uploadedAt: new Date().toISOString(),
    });
  }

  function playAudio(target) {
    const audio = library[target.key];
    if (audio?.dataUrl || audio?.url) {
      new Audio(audio.dataUrl || audio.url).play();
      return;
    }
    if (category === 'words') speakWord(target.key);
    else if (category === 'letters' || category === 'sounds') speakPhonicsSound(target.key, true);
    else speakText(target.label);
  }

  function exportManifest() {
    downloadJson('phonics-audio-manifest.json', content.audioLibrary || {});
  }

  function exportGithubGuide() {
    const rows = items.map((item) => `- ${item.label}: public/audio/${category}/${item.key}.mp3`).join('\n');
    downloadText('audio-github-upload-paths.txt', [
      'GitHub Pages 是靜態網站，瀏覽器不能直接把本機 mp3 寫回 GitHub repo。',
      '請把本頁上傳過的音檔另存到下列對應路徑，然後 commit/push 到 GitHub：',
      '',
      rows,
      '',
      '若要真正自動寫入 GitHub，需要使用 GitHub API + serverless backend 或 GitHub App，不能把 GitHub token 放在前端。',
    ].join('\n'));
  }

  return (
    <div className="admin-section">
      <div className="section-title-row">
        <div>
          <h2>音頻管理 v1.5</h2>
          <p>可按單元、分類或全部單元上傳與試聽。上傳後可立即在線播放，並可匯出 GitHub 路徑清單。</p>
        </div>
        <span className="big-emoji">🎧</span>
      </div>
      <div className="admin-toolbar">
        <label>上傳範圍
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="unit">按單元上傳</option>
            <option value="all">全部單元上傳</option>
          </select>
        </label>
        <label>單元
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={scope === 'all'}>
            {content.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.zh}</option>)}
          </select>
        </label>
        <label>分類
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {audioCategories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <button className="btn secondary" onClick={exportManifest}>匯出音檔 manifest</button>
        <button className="btn secondary" onClick={exportGithubGuide}>匯出 GitHub 路徑清單</button>
      </div>
      <div className="audio-grid">
        {items.map((item) => {
          const audio = library[item.key];
          return (
            <div className="audio-card" key={item.key}>
              <strong>{item.label}</strong>
              <span>{item.key}</span>
              <code>public/audio/{category}/{item.key}.mp3</code>
              <div className="hero-buttons compact">
                <button className="btn dark small" onClick={() => playAudio(item)}>聆聽</button>
                <label className="btn secondary small upload-label">上傳 mp3
                  <input type="file" accept="audio/mp3,audio/mpeg" onChange={(e) => uploadAudio(e.target.files?.[0], item)} />
                </label>
              </div>
              {audio ? <p className="hint">已上傳：{audio.fileName || 'audio'} · {audio.uploadedAt?.slice(0, 10)}</p> : <p className="hint">尚未上傳</p>}
            </div>
          );
        })}
      </div>
      <p className="hint">限制說明：瀏覽器前端不能安全地自動寫回 GitHub repo。此版提供即時試聽與雲端內容保存；正式自動寫入 GitHub 需要 serverless backend / GitHub App。</p>
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
      <div className="admin-toolbar">
        <select value={index} onChange={(e) => setIndex(Number(e.target.value))}>
          {content.stories.map((item, idx) => <option key={item.id || item.title} value={idx}>{item.title}</option>)}
        </select>
        <button className="btn secondary" onClick={addStory}>新增故事</button>
        <button className="btn danger" onClick={() => {
          const next = clone(content);
          next.stories.splice(index, 1);
          setContent(next);
          setIndex(Math.max(0, index - 1));
        }}>刪除故事</button>
      </div>
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
  const [section, setSection] = useState('units');
  return (
    <section className="panel admin-panel">
      <div className="section-title-row">
        <div><h2>管理員後台 v1.5</h2><p>單元下拉管理、項目點擊編輯、音檔分類管理、AI 遊戲功能設定。</p></div>
        <span className="big-emoji">🛠️</span>
      </div>
      <div className="chips large admin-tabs">
        {[
          ['site', '網站設定'],
          ['units', '單元管理'],
          ['stories', '故事管理'],
          ['audio', '音頻管理'],
        ].map(([key, label]) => <button key={key} className={section === key ? 'active-chip' : ''} onClick={() => setSection(key)}>{label}</button>)}
      </div>
      {section === 'site' ? <SiteAdmin content={content} setContent={setContent} /> : null}
      {section === 'units' ? <UnitAdmin content={content} setContent={setContent} /> : null}
      {section === 'stories' ? <StoriesAdmin content={content} setContent={setContent} /> : null}
      {section === 'audio' ? <AudioAdmin content={content} setContent={setContent} /> : null}
      <div className="hero-buttons compact admin-actions">
        <button className="btn primary" onClick={onSave}>儲存網站內容</button>
        <button className="btn secondary" onClick={onReset}>重設預設內容</button>
      </div>
    </section>
  );
}

function TeacherView({ content, progress }) {
  const dash = content.teacherDashboard || {};
  return (
    <div className="progress-grid">
      <section className="panel">
        <h2>教師後台</h2>
        <p>班級：{dash.className}</p>
        <p>{dash.note}</p>
        <div className="chips large">{(dash.assignments || []).map((id) => <span key={id}>{id}</span>)}</div>
      </section>
      <section className="panel">
        <h2>示範學生名單</h2>
        {(dash.roster || []).map((student) => (
          <div className="report-row" key={student.email}>
            <div><strong>{student.name}</strong><span>{student.email}</span></div>
            <div>⭐ {student.stars} · 錯題 {student.mistakes}</div>
          </div>
        ))}
      </section>
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

  useEffect(() => {
    setAudioLibrary(siteContent.audioLibrary || {});
  }, [siteContent.audioLibrary]);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = setTimeout(() => saveProgress(progress).catch(console.warn), 300);
    return () => clearTimeout(timer);
  }, [progress, ready]);

  const units = siteContent.units || [];
  const stories = siteContent.stories || [];
  const games = siteContent.games || [];
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) || units[0];
  const admin = isAdminUser(user, siteContent);
  const teacher = isTeacherUser(user, siteContent);

  function handlePractice(skill, word = '') {
    setProgress((prev) => mergeProgress(updatePracticeProgress(prev, skill, word)));
  }

  function handleComplete(unitId) {
    const unit = units.find((item) => item.id === unitId);
    setProgress((prev) => {
      const next = mergeProgress(prev);
      const alreadyDone = Boolean(next.completedUnits?.[unitId]);
      next.completedUnits = { ...next.completedUnits, [unitId]: true };
      if (!alreadyDone) next.stars += 10;
      next.badges = [...new Set([...(next.badges || []), unitId])];
      return next;
    });
    setMessage(`已完成 ${unit?.zh || unitId}，獲得 10 顆星星！`);
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="logo">🦊</div><div><h1>Phonics Adventure</h1><p>英文自然發音冒險</p></div></div>
        <nav>
          {[
            ['map', '學習地圖'],
            ['learn', '學習'],
            ['games', '遊戲'],
            ['read', '閱讀'],
            ['progress', '進度'],
            ...(teacher ? [['teacher', '教師']] : []),
            ...(admin ? [['admin', '管理']] : []),
          ].map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
        </nav>
        <div className="topbar-right">
          <UserMenu user={user} isAdmin={admin} isTeacher={teacher} onAuth={handleAuth} onSignOut={handleSignOut} message={message} />
          <div className="student-pill">⭐ {progress.stars} Stars</div>
        </div>
      </header>
      <main>
        <Hero content={siteContent} progress={progress} totalUnits={units.length} setTab={setTab} />
        <div className="message-strip">{message}</div>
        {tab === 'map' && <MapView units={units} progress={progress} selectedUnitId={selectedUnitId} setSelectedUnitId={setSelectedUnitId} setTab={setTab} search={search} setSearch={setSearch} />}
        {tab === 'learn' && selectedUnit && <LearnView unit={selectedUnit} stories={stories} progress={progress} onPractice={handlePractice} onComplete={handleComplete} />}
        {tab === 'games' && <GamesView games={games} units={units} selectedUnitId={selectedUnitId} onPractice={handlePractice} onMistake={(item) => setProgress((prev) => ({ ...prev, mistakes: [...(prev.mistakes || []), item].slice(-30) }))} />}
        {tab === 'read' && <ReadView stories={stories} onPractice={handlePractice} />}
        {tab === 'progress' && <ProgressView progress={progress} units={units} onClearMistakes={() => setProgress((prev) => ({ ...prev, mistakes: [] }))} />}
        {tab === 'teacher' && teacher && <TeacherView content={siteContent} progress={progress} />}
        {tab === 'admin' && admin && <AdminView content={siteContent} setContent={setSiteContent} onSave={handleSaveContent} onReset={handleResetContent} />}
      </main>
    </div>
  );
}
