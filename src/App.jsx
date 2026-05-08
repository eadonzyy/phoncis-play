import { useEffect, useMemo, useState } from 'react';
import { phonicsUnits, stories, games } from './data/phonics.js';
import { getCurrentUser, getProviderStatus, loadProgress, saveProgress, signIn, signOut, signUp } from './services/syncService.js';

const defaultProgress = {
  stars: 0,
  completedUnits: {},
  mistakes: [],
  badges: [],
  lastPracticed: null,
};

const soundMap = {
  c: '/k/', a: '/æ/', t: '/t/', m: '/m/', p: '/p/', i: '/ɪ/', g: '/g/', d: '/d/', o: '/ɒ/', b: '/b/', u: '/ʌ/', s: '/s/', f: '/f/', h: '/h/', r: '/r/', n: '/n/', e: '/e/', l: '/l/'
};

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.8;
  window.speechSynthesis.speak(utterance);
}

function mergeProgress(remote) {
  return {
    ...defaultProgress,
    ...(remote || {}),
    completedUnits: { ...defaultProgress.completedUnits, ...(remote?.completedUnits || {}) },
    mistakes: remote?.mistakes || [],
    badges: remote?.badges || [],
  };
}

function AuthPanel({ user, onUserChange, onMessage }) {
  const [email, setEmail] = useState('student@example.com');
  const [password, setPassword] = useState('student123');
  const [loading, setLoading] = useState(false);
  const status = getProviderStatus();

  async function handleAuth(mode) {
    setLoading(true);
    try {
      const nextUser = mode === 'signup' ? await signUp(email, password) : await signIn(email, password);
      onUserChange(nextUser);
      onMessage(`${mode === 'signup' ? '註冊' : '登入'}成功：${nextUser?.email || 'local user'}`);
    } catch (error) {
      onMessage(error.message || '登入失敗，請檢查設定。');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    onUserChange(null);
    onMessage('已登出。');
  }

  return (
    <section className="panel auth-panel">
      <div className="section-title-row">
        <div>
          <h2>登入與同步</h2>
          <p>目前同步模式：<strong>{status.name}</strong> {status.configured ? '✅' : '⚠️ 尚未配置'}</p>
        </div>
        <span className="big-emoji">☁️</span>
      </div>

      {user ? (
        <div className="signed-in-box">
          <p>已登入：<strong>{user.email || user.id}</strong></p>
          <button className="btn secondary" onClick={handleSignOut}>登出</button>
        </div>
      ) : (
        <div className="auth-grid">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="至少 6 位" />
          </label>
          <button className="btn primary" disabled={loading} onClick={() => handleAuth('signin')}>登入</button>
          <button className="btn secondary" disabled={loading} onClick={() => handleAuth('signup')}>註冊</button>
        </div>
      )}
      <p className="hint">提示：如果沒有填 Supabase/Firebase 配置，網站會自動用本機儲存，方便你先測試畫面。</p>
    </section>
  );
}

function ProgressCircle({ progress }) {
  const completedCount = Object.keys(progress.completedUnits || {}).length;
  const percent = Math.round((completedCount / phonicsUnits.length) * 100);
  return (
    <div className="progress-circle" style={{ background: `conic-gradient(#f59e0b ${percent * 3.6}deg, #fff7ed 0deg)` }}>
      <div>
        <strong>{percent}%</strong>
        <span>完成</span>
      </div>
    </div>
  );
}

function UnitCard({ unit, selected, completed, locked, onClick }) {
  return (
    <button className={`unit-card ${unit.theme} ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`} onClick={onClick}>
      <div className="unit-top">
        <span className="unit-icon">{unit.icon}</span>
        <span className="level-pill">Level {unit.level}</span>
      </div>
      <h3>{unit.title}</h3>
      <p className="unit-zh">{unit.zh}</p>
      <p>{unit.description}</p>
      <div className="chips">
        {unit.patterns.slice(0, 4).map((pattern) => <span key={pattern}>{pattern}</span>)}
      </div>
      {completed && <div className="complete-mark">✓ 已完成</div>}
      {locked && <div className="lock-mark">🔒 待解鎖</div>}
    </button>
  );
}

function InteractiveBlender({ onPractice }) {
  const presets = ['cat', 'map', 'pig', 'dog', 'bus', 'sit', 'hot', 'hen', 'run'];
  const [word, setWord] = useState('cat');
  const letters = word.split('');

  function playLetter(letter) {
    speak(letter);
  }

  function blend() {
    speak(word);
    onPractice('cvc');
  }

  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>互動拼讀板</h2>
          <p>點字母聽音，再按 Blend 合成單字。</p>
        </div>
        <span className="big-emoji">🧱</span>
      </div>
      <div className="blender-box">
        {letters.map((letter, index) => (
          <button className="letter-tile" key={`${letter}-${index}`} onClick={() => playLetter(letter)}>
            <strong>{letter}</strong>
            <span>{soundMap[letter] || '/?/'}</span>
          </button>
        ))}
        <span className="arrow">→</span>
        <button className="word-result" onClick={blend}>{word}<span>🔊</span></button>
      </div>
      <div className="chips large">
        {presets.map((item) => <button key={item} onClick={() => setWord(item)}>{item}</button>)}
      </div>
    </section>
  );
}

function MagicE({ onPractice }) {
  const pairs = [
    ['cap', 'cape', '🧢', '🦸'],
    ['pin', 'pine', '📌', '🌲'],
    ['hop', 'hope', '🐇', '🌟'],
    ['cub', 'cube', '🐻', '🧊'],
    ['tap', 'tape', '👆', '📼'],
  ];
  const [index, setIndex] = useState(0);
  const [magic, setMagic] = useState(false);
  const pair = pairs[index];

  function toggleMagic() {
    const next = !magic;
    setMagic(next);
    speak(next ? pair[1] : pair[0]);
    onPractice('magic-e');
  }

  return (
    <section className="panel magic-panel">
      <div className="section-title-row">
        <div>
          <h2>Magic E 動畫區</h2>
          <p>把 e 加到字尾，觀察聲音和圖片如何改變。</p>
        </div>
        <span className="big-emoji">🪄</span>
      </div>
      <div className="magic-stage">
        <div className="magic-card">
          <span>{magic ? pair[3] : pair[2]}</span>
          <strong>{magic ? pair[1] : pair[0]}</strong>
        </div>
        <button className="btn purple" onClick={toggleMagic}>{magic ? 'Remove e' : 'Add magic e'}</button>
      </div>
      <div className="chips large">
        {pairs.map((p, i) => <button key={p[0]} onClick={() => { setIndex(i); setMagic(false); }}>{p[0]} → {p[1]}</button>)}
      </div>
    </section>
  );
}

function LearnView({ selectedUnit, onPractice, onComplete }) {
  return (
    <div className="learn-grid">
      <section className={`panel unit-detail ${selectedUnit.theme}`}>
        <div className="section-title-row">
          <div>
            <h2>{selectedUnit.title}</h2>
            <p>{selectedUnit.zh}</p>
          </div>
          <span className="big-emoji">{selectedUnit.icon}</span>
        </div>
        <p className="detail-desc">{selectedUnit.description}</p>
        <h3>本單元音型</h3>
        <div className="chips large">
          {selectedUnit.patterns.map((pattern) => <button key={pattern} onClick={() => speak(pattern.replace(/[/:→-]/g, ' '))}>🔊 {pattern}</button>)}
        </div>
        <h3>單字卡</h3>
        <div className="word-grid">
          {selectedUnit.words.map((word) => <button key={word} onClick={() => speak(word)}>{word}<span>🔊</span></button>)}
        </div>
        <button className="btn primary full" onClick={() => onComplete(selectedUnit.id)}>完成本單元，獲得星星 ⭐</button>
      </section>
      <div className="stack">
        <InteractiveBlender onPractice={onPractice} />
        <MagicE onPractice={onPractice} />
      </div>
    </div>
  );
}

function MapView({ progress, selectedUnit, setSelectedUnit, setTab, search, setSearch }) {
  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phonicsUnits;
    return phonicsUnits.filter((unit) => [unit.title, unit.zh, unit.description, ...unit.patterns, ...unit.words].join(' ').toLowerCase().includes(q));
  }, [search]);

  return (
    <section className="map-view">
      <div className="section-heading">
        <div>
          <h2>學習地圖</h2>
          <p>按照難度循序漸進，完整涵蓋小學生 Phonics 核心內容。</p>
        </div>
        <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 ai, sh, Magic E..." />
      </div>
      <div className="unit-grid">
        {filteredUnits.map((unit, index) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            selected={selectedUnit.id === unit.id}
            completed={Boolean(progress.completedUnits?.[unit.id])}
            locked={index > 8 && !progress.completedUnits?.['vowel-teams']}
            onClick={() => { setSelectedUnit(unit); setTab('learn'); }}
          />
        ))}
      </div>
    </section>
  );
}

function GamesView({ onPractice }) {
  return (
    <section>
      <div className="section-heading simple">
        <div>
          <h2>遊戲練習區</h2>
          <p>每個遊戲只練一個明確技能，降低操作難度。</p>
        </div>
      </div>
      <div className="game-grid">
        {games.map((game) => (
          <article className="game-card" key={game.title}>
            <span className="game-icon">{game.icon}</span>
            <h3>{game.title}</h3>
            <p><strong>{game.zh}</strong></p>
            <p>技能：{game.skill}</p>
            <button className="btn dark full" onClick={() => onPractice(game.title)}>開始挑戰</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReadView({ onPractice }) {
  return (
    <div className="read-grid">
      <section className="panel">
        <h2>Decodable Readers 可拼讀故事</h2>
        <p>故事只使用學生已學過的音型，讓 Phonics 連到真正閱讀。</p>
        <div className="story-list">
          {stories.map((story) => (
            <article className="story-card" key={story.title}>
              <div className="story-top">
                <h3>{story.title}</h3>
                <span>{story.level}</span>
              </div>
              <p className="story-text">{story.text}</p>
              <div className="chips large">
                {story.focus.map((word) => <button key={word} onClick={() => speak(word)}>{word} 🔊</button>)}
              </div>
              <button className="btn primary" onClick={() => { speak(story.text); onPractice('reader'); }}>朗讀全文</button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel mic-panel">
        <span className="big-emoji">🎙️</span>
        <h2>跟讀錄音</h2>
        <p>正式版可以加入錄音上傳或 Web Speech API 評估。這個原型先保留互動入口。</p>
        <button className="btn pink full" onClick={() => onPractice('recording')}>按住錄音</button>
      </section>
    </div>
  );
}

function ProgressView({ progress, user }) {
  const completedIds = Object.keys(progress.completedUnits || {});
  const badges = [
    ['Alphabet Master', completedIds.includes('alphabet')],
    ['Blending Star', completedIds.includes('cvc')],
    ['Magic E Wizard', completedIds.includes('magic-e')],
    ['Reading Explorer', progress.completedUnits?.reader],
    ['Bossy R Hero', completedIds.includes('r-controlled')],
  ];

  return (
    <div className="progress-grid">
      <section className="panel sync-panel">
        <span className="big-emoji">☁️</span>
        <h2>雲端同步設計</h2>
        <p>學生登入後，進度、星星、錯題與閱讀紀錄會同步到雲端，換電腦也能接續學習。</p>
        <div className="mini-grid">
          <div><strong>登入</strong><span>Email / Google 可擴充</span></div>
          <div><strong>同步</strong><span>Supabase 或 Firebase</span></div>
          <div><strong>離線</strong><span>本機先存，雲端再同步</span></div>
          <div><strong>權限</strong><span>學生、家長、教師</span></div>
        </div>
        <p className="hint">目前使用者：{user?.email || '未登入'}</p>
      </section>

      <section className="panel">
        <h2>學習報告</h2>
        <p>家長與教師可快速了解學生強弱項。</p>
        <div className="report-list">
          {phonicsUnits.map((unit, index) => {
            const done = Boolean(progress.completedUnits?.[unit.id]);
            const value = done ? 100 : Math.max(10, 65 - index * 4);
            return (
              <div className="report-row" key={unit.id}>
                <div><strong>{unit.zh}</strong><span>{done ? '已完成' : '學習中'}</span></div>
                <div className="bar"><span style={{ width: `${value}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel badge-panel">
        <h2>徽章收藏</h2>
        <div className="badge-grid">
          {badges.map(([name, earned]) => <div className={earned ? 'badge earned' : 'badge'} key={name}>⭐<strong>{name}</strong></div>)}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('map');
  const [selectedUnit, setSelectedUnit] = useState(phonicsUnits[2]);
  const [progress, setProgress] = useState(defaultProgress);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('歡迎來到 Phonics Adventure!');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function init() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      const saved = await loadProgress();
      setProgress(mergeProgress(saved));
    }
    init();
  }, []);

  async function persist(nextProgress, customMessage) {
    setProgress(nextProgress);
    await saveProgress(nextProgress);
    setMessage(customMessage || '已保存進度。');
  }

  async function handleComplete(unitId) {
    const next = mergeProgress({
      ...progress,
      stars: (progress.stars || 0) + (progress.completedUnits?.[unitId] ? 0 : 5),
      completedUnits: { ...(progress.completedUnits || {}), [unitId]: true },
      lastPracticed: new Date().toISOString(),
    });
    await persist(next, '太棒了！本單元已完成，獲得 5 顆星星 ⭐');
  }

  async function handlePractice(skill) {
    const next = mergeProgress({
      ...progress,
      stars: (progress.stars || 0) + 1,
      completedUnits: { ...(progress.completedUnits || {}), [skill]: progress.completedUnits?.[skill] || false },
      lastPracticed: new Date().toISOString(),
    });
    await persist(next, '已記錄一次練習，獲得 1 顆星星 ⭐');
  }

  async function handleUserChange(nextUser) {
    setUser(nextUser);
    const saved = await loadProgress();
    setProgress(mergeProgress(saved));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">🦊</div>
          <div>
            <h1>Phonics Adventure</h1>
            <p>英文自然發音冒險島</p>
          </div>
        </div>
        <nav>
          {[
            ['map', '學習地圖'],
            ['learn', '學習'],
            ['games', '遊戲'],
            ['read', '閱讀'],
            ['progress', '進度'],
          ].map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
        </nav>
        <div className="student-pill">👤 {user?.email?.split('@')[0] || 'Student'}</div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="mission">✨ 今日任務：完成 2 個拼讀挑戰</span>
            <h2>讓小學生像闖關一樣學完整 Phonics</h2>
            <p>從字母音、短母音、CVC、blends、digraphs、Magic E、vowel teams、Bossy R 到可拼讀故事，搭配遊戲、錯題複習與雲端同步。</p>
            <div className="hero-actions">
              <button className="btn dark" onClick={() => setTab('learn')}>開始學習</button>
              <button className="btn secondary" onClick={() => setTab('games')}>玩遊戲</button>
            </div>
          </div>
          <div className="hero-side">
            <ProgressCircle progress={progress} />
            <div className="stat-card">🏆 <strong>{progress.stars || 0}</strong><span>星星</span></div>
            <div className="stat-card">🔁 <strong>{progress.mistakes?.length || 0}</strong><span>錯題待複習</span></div>
          </div>
        </section>

        <div className="message-bar">{message}</div>

        <AuthPanel user={user} onUserChange={handleUserChange} onMessage={setMessage} />

        {tab === 'map' && <MapView progress={progress} selectedUnit={selectedUnit} setSelectedUnit={setSelectedUnit} setTab={setTab} search={search} setSearch={setSearch} />}
        {tab === 'learn' && <LearnView selectedUnit={selectedUnit} onPractice={handlePractice} onComplete={handleComplete} />}
        {tab === 'games' && <GamesView onPractice={handlePractice} />}
        {tab === 'read' && <ReadView onPractice={handlePractice} />}
        {tab === 'progress' && <ProgressView progress={progress} user={user} />}
      </main>
    </div>
  );
}
