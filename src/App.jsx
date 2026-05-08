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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function toDateString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function getYesterdayString(baseString) {
  const date = new Date(baseString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function updatePracticeProgress(progress, skill, word = '') {
  const today = toDateString(new Date().toISOString());
  const lastDate = toDateString(progress.lastPracticed);
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

function splitLines(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pairLinesToArray(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.split('|').map((part) => part.trim());
      return [a || '', b || ''];
    })
    .filter((pair) => pair[0] && pair[1]);
}

function pairsToText(pairs) {
  return (pairs || []).map((pair) => `${pair[0]}|${pair[1]}`).join('\n');
}

function storyToText(story) {
  if (!story) return '';
  return `${story.title} (${story.level})`;
}

function completedPercent(progress, total) {
  return Math.round((Object.keys(progress.completedUnits || {}).length / total) * 100);
}

function addBadgeIfNeeded(progress, badgeKey) {
  if (progress.badges.includes(badgeKey)) return progress.badges;
  return [...progress.badges, badgeKey];
}

function UserMenu({ user, isAdmin, isTeacher, onAuth, onSignOut, message }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('student@example.com');
  const [password, setPassword] = useState('student123');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const nextUser = mode === 'signup' ? await signUp(email, password) : await signIn(email, password);
      onAuth(nextUser, `${mode === 'signup' ? '註冊' : '登入'}成功：${nextUser?.email || ''}`);
      setOpen(false);
    } catch (error) {
      onAuth(null, error.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="user-menu">
        <button className="user-chip" onClick={() => setOpen((v) => !v)}>
          👤 {user.email?.split('@')[0] || 'student'}
        </button>
        {open && (
          <div className="dropdown-card">
            <p><strong>{user.email}</strong></p>
            <p className="hint">{isAdmin ? '管理員身份' : isTeacher ? '教師身份' : '學生身份'}</p>
            {message ? <p className="hint">{message}</p> : null}
            <button className="btn secondary full" onClick={() => { onSignOut(); setOpen(false); }}>登出</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="user-menu">
      <button className="btn secondary small" onClick={() => { setMode('signin'); setOpen((v) => !v); }}>登入 / 註冊</button>
      {open && (
        <form className="dropdown-card auth-mini-form" onSubmit={handleSubmit}>
          <div className="toggle-row">
            <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>登入</button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>註冊</button>
          </div>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn dark full" disabled={loading}>{mode === 'signup' ? '註冊' : '登入'}</button>
        </form>
      )}
    </div>
  );
}

function ProgressCircle({ progress, total }) {
  const percent = completedPercent(progress, total);
  return (
    <div className="progress-circle" style={{ background: `conic-gradient(#f59e0b ${percent * 3.6}deg, #fff7ed 0deg)` }}>
      <div>
        <strong>{percent}%</strong>
        <span>完成</span>
      </div>
    </div>
  );
}

function MapView({ units, progress, selectedUnit, setSelectedUnit, setTab, search, setSearch }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units;
    return units.filter((unit) => [unit.title, unit.zh, unit.description, ...unit.patterns, ...unit.words].join(' ').toLowerCase().includes(q));
  }, [search, units]);

  return (
    <section className="map-view">
      <div className="section-heading">
        <div>
          <h2>12 個完整 Phonics 單元</h2>
          <p>從字母音、短母音、CVC 到 syllables，涵蓋完整小學生 phonics 課程路徑。</p>
        </div>
        <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋 ai、Magic E、Bossy R..." />
      </div>
      <div className="unit-grid">
        {filtered.map((unit) => {
          const completed = Boolean(progress.completedUnits?.[unit.id]);
          return (
            <button
              key={unit.id}
              className={`unit-card ${unit.theme} ${selectedUnit?.id === unit.id ? 'selected' : ''}`}
              onClick={() => { setSelectedUnit(unit); setTab('learn'); }}
            >
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
              {completed ? <div className="complete-mark">✓ 已完成</div> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LetterSoundBoard({ onPractice }) {
  return (
    <section className="panel sound-board-panel">
      <div className="section-title-row">
        <div>
          <h2>Letter Sound Board</h2>
          <p>字母卡會優先播放真人 mp3；如果沒有音檔，才自動改用瀏覽器發音。</p>
        </div>
        <span className="big-emoji">🔊</span>
      </div>
      <div className="sound-board-grid">
        {alphabetSounds.map((item) => (
          <button key={item.key} className="sound-card" onClick={() => { speakPhonicsSound(item.key, true); onPractice('alphabet', item.example); }}>
            <span className="sound-picture">{item.picture}</span>
            <strong>{item.letter.toLowerCase()}</strong>
            <em>{item.symbol}</em>
            <small>{item.example}</small>
          </button>
        ))}
      </div>
      <p className="hint">真人音檔建議放到 <code>public/audio/letters</code>、<code>public/audio/sounds</code>、<code>public/audio/words</code>。</p>
    </section>
  );
}

function InteractiveBlender({ unit, onPractice }) {
  const presets = unit?.blendingSet?.length ? unit.blendingSet : ['cat', 'map', 'pig'];
  const [word, setWord] = useState(presets[0]);

  useEffect(() => {
    setWord(presets[0]);
  }, [unit?.id]);

  const letters = String(word || '').split('');
  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>互動拼讀板</h2>
          <p>此區會跟著目前單元的練習字變化。管理員也可在後台修改每單元的 blendingSet。</p>
        </div>
        <span className="big-emoji">🧱</span>
      </div>
      <div className="blender-box">
        {letters.map((letter, index) => (
          <button key={`${letter}-${index}`} className="letter-tile" onClick={() => { speakPhonicsSound(letter, false); onPractice(unit?.id || 'blending', letter); }}>
            <strong>{letter}</strong>
            <span>{getSoundSymbol(letter)}</span>
          </button>
        ))}
        <span className="arrow">→</span>
        <button className="word-result" onClick={() => { speakBlendWord(word); onPractice(unit?.id || 'blending', word); }}>{word}<span>🔊</span></button>
      </div>
      <div className="chips large">
        {presets.map((item) => <button key={item} onClick={() => setWord(item)}>{item}</button>)}
      </div>
    </section>
  );
}

function MagicE({ unit, onPractice }) {
  const pairs = unit?.magicEPairs?.length ? unit.magicEPairs : [['cap', 'cape'], ['pin', 'pine']];
  const [index, setIndex] = useState(0);
  const [magic, setMagic] = useState(false);

  useEffect(() => {
    setIndex(0);
    setMagic(false);
  }, [unit?.id]);

  const pair = pairs[index] || ['cap', 'cape'];
  return (
    <section className="panel magic-panel">
      <div className="section-title-row">
        <div>
          <h2>Magic E 動畫區</h2>
          <p>本區也會跟著單元變化。如果後台改了 magicEPairs，這裡會同步顯示新資料。</p>
        </div>
        <span className="big-emoji">🪄</span>
      </div>
      <div className="magic-stage">
        <div className="magic-card big">
          <span>{magic ? '✨' : '🔤'}</span>
          <strong>{magic ? pair[1] : pair[0]}</strong>
        </div>
        <button className="btn purple" onClick={() => { const next = !magic; setMagic(next); speakWord(next ? pair[1] : pair[0]); onPractice(unit?.id || 'magic-e', next ? pair[1] : pair[0]); }}>
          {magic ? 'Remove e' : 'Add magic e'}
        </button>
      </div>
      <div className="chips large">
        {pairs.map((item, i) => <button key={`${item[0]}-${item[1]}`} onClick={() => { setIndex(i); setMagic(false); }}>{item[0]} → {item[1]}</button>)}
      </div>
    </section>
  );
}

function LearnView({ unit, stories, progress, onPractice, onComplete }) {
  const story = stories.find((item) => item.title === unit.storyTitle) || stories[0];
  return (
    <div className="learn-grid">
      <section className={`panel unit-detail ${unit.theme}`}>
        <div className="section-title-row">
          <div>
            <h2>{unit.title}</h2>
            <p>{unit.zh}</p>
          </div>
          <span className="big-emoji">{unit.icon}</span>
        </div>
        <p className="detail-desc">{unit.description}</p>
        <h3>學習重點</h3>
        <ul className="check-list">
          {unit.learnTips.map((tip) => <li key={tip}>{tip}</li>)}
        </ul>
        <h3>本單元音型</h3>
        <div className="chips large">
          {unit.patterns.map((pattern) => <button key={pattern} onClick={() => { speakPattern(pattern); onPractice(unit.id, pattern); }}>🔊 {pattern}</button>)}
        </div>
        <h3>單字卡</h3>
        <div className="word-grid">
          {unit.words.map((word) => <button key={word} onClick={() => { speakWord(word); onPractice(unit.id, word); }}>{word}<span>🔊</span></button>)}
        </div>
      </section>
      <div className="stack">
        {unit.id === 'alphabet' ? <LetterSoundBoard onPractice={onPractice} /> : null}
        <InteractiveBlender unit={unit} onPractice={onPractice} />
        <MagicE unit={unit} onPractice={onPractice} />
        <section className="panel">
          <div className="section-title-row">
            <div>
              <h2>Read 小故事</h2>
              <p>學完音型後，立刻讀一小段故事，把拼讀連到閱讀。</p>
            </div>
            <span className="big-emoji">📖</span>
          </div>
          <p className="story-text bridge-story">{story.text}</p>
          <div className="chips large">
            {story.focus.map((word) => <button key={word} onClick={() => { speakWord(word); onPractice('reader', word); }}>{word} 🔊</button>)}
          </div>
          <button className="btn secondary" onClick={() => { speakText(story.text); onPractice('reader', story.title); }}>朗讀故事</button>
        </section>
        <section className="panel check-panel">
          <div className="section-title-row">
            <div>
              <h2>Check 單元檢核</h2>
              <p>完成後可獲得 10 顆星星，並解鎖該單元進度。</p>
            </div>
            <span className="big-emoji">✅</span>
          </div>
          <button className="btn primary full" onClick={() => onComplete(unit.id)}>
            {progress.completedUnits?.[unit.id] ? '已完成本單元 ⭐' : '完成本單元，獲得星星 ⭐'}
          </button>
        </section>
      </div>
    </div>
  );
}

function SoundMonsterGame({ onPractice, onMistake }) {
  function makeRound(previousKey) {
    let target = alphabetSounds[Math.floor(Math.random() * alphabetSounds.length)];
    if (previousKey && alphabetSounds.length > 1) {
      let guard = 0;
      while (target.key === previousKey && guard < 10) {
        target = alphabetSounds[Math.floor(Math.random() * alphabetSounds.length)];
        guard += 1;
      }
    }
    const choices = [...alphabetSounds.filter((item) => item.key !== target.key).sort(() => Math.random() - 0.5).slice(0, 3), target]
      .sort(() => Math.random() - 0.5);
    return { target, choices, result: '' };
  }

  const [round, setRound] = useState(() => makeRound());

  return (
    <div className="game-stage-box">
      <h3>Sound Monster</h3>
      <p>按播放，聽 phonics sound，再選正確字母。</p>
      <button className="monster-button" onClick={() => speakPhonicsSound(round.target.key, false)}>🔊 播放聲音</button>
      <div className="quiz-options">
        {round.choices.map((choice) => (
          <button key={choice.key} className="quiz-choice" onClick={() => {
            if (choice.key === round.target.key) {
              speakWord(choice.example);
              onPractice('sound-monster', choice.example);
              setRound({ ...round, result: `答對了！${choice.letter} ${choice.symbol}` });
            } else {
              onMistake({
                id: `${Date.now()}-${round.target.key}`,
                skill: 'Letter sounds',
                expected: round.target.key,
                expectedLabel: `${round.target.letter} ${round.target.symbol}`,
                chosen: choice.key,
                chosenLabel: `${choice.letter} ${choice.symbol}`,
                createdAt: new Date().toISOString(),
              });
              speakPhonicsSound(round.target.key, true);
              setRound({ ...round, result: `再試一次：正確答案是 ${round.target.letter.toLowerCase()}` });
            }
          }}>
            <span>{choice.picture}</span>
            <strong>{choice.letter.toLowerCase()}</strong>
            <em>{choice.symbol}</em>
          </button>
        ))}
      </div>
      {round.result ? <p className="quiz-result">{round.result}</p> : null}
      <button className="btn dark" onClick={() => setRound(makeRound(round.target.key))}>下一題</button>
    </div>
  );
}

function WordTrainGame({ onPractice }) {
  const rounds = [
    { family: '-at', choices: ['cat', 'hat', 'dig', 'mat'], answer: ['cat', 'hat', 'mat'] },
    { family: '-ig', choices: ['pig', 'wig', 'dog', 'big'], answer: ['pig', 'wig', 'big'] },
  ];
  const [index, setIndex] = useState(0);
  const round = rounds[index];
  return (
    <div className="game-stage-box">
      <h3>Word Train</h3>
      <p>只顯示一個遊戲，讓小朋友更專心。請找出屬於 {round.family} 的單字。</p>
      <div className="option-grid four">
        {round.choices.map((word) => <button key={word} onClick={() => { speakWord(word); onPractice('word-train', word); }}>{word}</button>)}
      </div>
      <p className="hint">正確家族：{round.answer.join(', ')}</p>
      <button className="btn secondary" onClick={() => setIndex((index + 1) % rounds.length)}>換一題</button>
    </div>
  );
}

function MagicELabGame({ onPractice }) {
  const pairs = [['cap', 'cape'], ['hop', 'hope'], ['cub', 'cube'], ['pin', 'pine']];
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [base, transformed] = pairs[index];
  return (
    <div className="game-stage-box">
      <h3>Magic E Lab</h3>
      <p>幫短母音單字加上 e，看看它如何變身成長母音單字。</p>
      <div className="magic-lab-grid">
        <button className="practice-word" onClick={() => { speakWord(base); onPractice('magic-lab', base); }}>{base}</button>
        <span className="arrow">＋ e →</span>
        <button className="practice-word success" onClick={() => { speakWord(transformed); onPractice('magic-lab', transformed); setShowAnswer(true); }}>
          {showAnswer ? transformed : '????'}
        </button>
      </div>
      <div className="hero-buttons compact">
        <button className="btn secondary" onClick={() => setShowAnswer((v) => !v)}>{showAnswer ? '隱藏答案' : '看答案'}</button>
        <button className="btn dark" onClick={() => { setIndex((index + 1) % pairs.length); setShowAnswer(false); }}>下一組</button>
      </div>
    </div>
  );
}

function FishingWordsGame({ onPractice }) {
  const rounds = [
    { clue: 'sh sound', choices: ['ship', 'cat', 'dog'], answer: 'ship' },
    { clue: 'long a', choices: ['cake', 'pig', 'sun'], answer: 'cake' },
  ];
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState('');
  const round = rounds[index];
  return (
    <div className="game-stage-box">
      <h3>Fishing Words</h3>
      <p>請釣出符合提示的單字：<strong>{round.clue}</strong></p>
      <div className="option-grid four">
        {round.choices.map((word) => <button key={word} onClick={() => { speakWord(word); onPractice('fishing', word); setResult(word === round.answer ? '答對了！' : `再試一次，答案是 ${round.answer}`); }}>{word}</button>)}
      </div>
      {result ? <p className="quiz-result">{result}</p> : null}
      <button className="btn secondary" onClick={() => { setIndex((index + 1) % rounds.length); setResult(''); }}>換一題</button>
    </div>
  );
}

function renderGameByType(type, props) {
  if (type === 'sound-monster') return <SoundMonsterGame {...props} />;
  if (type === 'word-train') return <WordTrainGame {...props} />;
  if (type === 'magic-lab') return <MagicELabGame {...props} />;
  return <FishingWordsGame {...props} />;
}

function GamesView({ games, onPractice, onMistake }) {
  const [index, setIndex] = useState(0);
  const activeGame = games[index] || games[0];

  return (
    <section>
      <div className="section-heading simple">
        <div>
          <h2>遊戲練習區</h2>
          <p>一次只顯示一個遊戲，避免畫面過度擁擠。</p>
        </div>
      </div>
      <section className="panel active-game-panel">
        <div className="section-title-row">
          <div>
            <h2>{activeGame.icon} {activeGame.title}</h2>
            <p>{activeGame.zh} · 技能：{activeGame.skill}</p>
          </div>
          <div className="game-nav-inline">
            <button className="btn secondary small" onClick={() => setIndex((index - 1 + games.length) % games.length)}>上一個</button>
            <button className="btn secondary small" onClick={() => setIndex((index + 1) % games.length)}>下一個</button>
          </div>
        </div>
        {renderGameByType(activeGame.type, { onPractice, onMistake })}
      </section>
      <div className="chips large game-selector">
        {games.map((game, gameIndex) => (
          <button key={game.id} className={gameIndex === index ? 'active-chip' : ''} onClick={() => setIndex(gameIndex)}>
            {game.icon} {game.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function ClickableStory({ text, onPractice }) {
  const tokens = text.split(/(\s+)/);
  return (
    <div className="story-text clickable-story">
      {tokens.map((token, index) => {
        if (/^\s+$/.test(token)) return token;
        const clean = token.replace(/[^a-zA-Z]/g, '');
        if (!clean) return token;
        return (
          <button key={`${token}-${index}`} onClick={() => { speakWord(clean); onPractice('reader', clean); }}>{token}</button>
        );
      })}
    </div>
  );
}

function ReadView({ stories, onPractice }) {
  return (
    <div className="read-grid">
      <section className="panel">
        <h2>Decodable Readers</h2>
        <p>每個單字都能點擊發音，搭配真人音檔架構與句子朗讀。</p>
        <div className="story-list">
          {stories.map((story) => (
            <article className="story-card" key={story.id}>
              <div className="story-top">
                <h3>{story.title}</h3>
                <span>{story.level}</span>
              </div>
              <ClickableStory text={story.text} onPractice={onPractice} />
              <div className="chips large">
                {story.focus.map((word) => <button key={word} onClick={() => { speakWord(word); onPractice('reader', word); }}>{word} 🔊</button>)}
              </div>
              <button className="btn primary" onClick={() => { speakText(story.text); onPractice('reader', story.title); }}>朗讀全文</button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel mic-panel">
        <span className="big-emoji">🎙️</span>
        <h2>跟讀錄音架構</h2>
        <p>下一步可接入 Web Speech API、錄音上傳，或真人評分機制。此版先保留互動入口。</p>
        <button className="btn pink full" onClick={() => onPractice('recording', 'voice practice')}>按住錄音</button>
      </section>
    </div>
  );
}

function ProgressView({ progress, units, onClearMistakes }) {
  const completedIds = Object.keys(progress.completedUnits || {});
  const frequentWords = Object.entries(progress.practiceWords || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="progress-grid">
      <section className="panel passport-panel">
        <div className="section-title-row">
          <div>
            <h2>我的 Phonics Passport</h2>
            <p>已完成單元、星星數、連續學習天數、常練單字與每日任務都集中在這裡。</p>
          </div>
          <span className="big-emoji">🛂</span>
        </div>
        <div className="passport-grid">
          <div><strong>{completedIds.length}</strong><span>已完成單元</span></div>
          <div><strong>{progress.stars}</strong><span>星星數</span></div>
          <div><strong>{progress.streakDays}</strong><span>連續學習天數</span></div>
          <div><strong>{progress.practiceCount}</strong><span>練習次數</span></div>
        </div>
        <div className="daily-mission">
          <strong>今日任務</strong>
          <ul>
            <li>{progress.practiceCount >= 3 ? '✅' : '⬜'} 練習 3 次 phonics</li>
            <li>{progress.readingLog >= 1 ? '✅' : '⬜'} 朗讀 1 篇故事</li>
            <li>{(progress.mistakes?.length || 0) === 0 ? '✅' : '⬜'} 複習最近錯題</li>
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>學習報告</h2>
            <p>教師與家長可快速看見學生學到哪裡。</p>
          </div>
          <span className="big-emoji">📊</span>
        </div>
        <div className="report-list">
          {units.map((unit, index) => {
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

      <section className="panel mistake-panel">
        <div className="section-title-row">
          <div>
            <h2>錯題本</h2>
            <p>答錯的聲音會出現在這裡，方便每日複習。</p>
          </div>
          <button className="btn secondary" onClick={onClearMistakes}>清空錯題</button>
        </div>
        {progress.mistakes?.length ? (
          <div className="mistake-list">
            {progress.mistakes.slice(-8).reverse().map((item) => {
              const entry = getSoundEntry(item.expected);
              return (
                <div className="mistake-item" key={item.id}>
                  <button onClick={() => speakPhonicsSound(item.expected, true)}>{entry?.picture || '🔊'}</button>
                  <div>
                    <strong>{item.expectedLabel || item.expected}</strong>
                    <span>誤選：{item.chosenLabel || item.chosen}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="hint">目前沒有錯題，太棒了！</p>}
        <h3>常練單字</h3>
        <div className="chips large">
          {frequentWords.length ? frequentWords.map(([word, count]) => <button key={word} onClick={() => speakWord(word)}>{word} × {count}</button>) : <span className="empty-chip">開始練習後會顯示資料</span>}
        </div>
      </section>
    </div>
  );
}


function sanitizeAudioKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AudioUploadManager({ content, setContent }) {
  const [category, setCategory] = useState('letters');
  const [audioKey, setAudioKey] = useState('a');
  const library = content.audioLibrary || { letters: {}, sounds: {}, words: {}, phrases: {} };
  const currentItems = library[category] || {};

  async function handleFile(file) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const key = sanitizeAudioKey(audioKey || file.name.replace(/\.mp3$/i, ''));
    const next = clone(content);
    next.audioLibrary = next.audioLibrary || { letters: {}, sounds: {}, words: {}, phrases: {} };
    next.audioLibrary[category] = next.audioLibrary[category] || {};
    next.audioLibrary[category][key] = {
      name: file.name,
      key,
      category,
      dataUrl,
      size: file.size,
      updatedAt: new Date().toISOString(),
    };
    setContent(next);
  }

  function removeAudio(key) {
    const next = clone(content);
    delete next.audioLibrary?.[category]?.[key];
    setContent(next);
  }

  function testAudio(key) {
    if (category === 'letters' || category === 'sounds') speakPhonicsSound(key, true);
    if (category === 'words') speakWord(key);
    if (category === 'phrases') speakText(key);
  }

  return (
    <div className="admin-form-grid audio-manager">
      <div className="admin-help-box">
        <strong>音檔上傳管理</strong>
        <p>上傳後會先存到網站內容資料中。GitHub Pages 不能直接寫入檔案，所以這版使用 data URL 方式保存；正式大量音檔建議仍放到 <code>public/audio</code> 或 Supabase Storage。</p>
      </div>
      <div className="audio-upload-row">
        <label>
          類別
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="letters">letters 字母音</option>
            <option value="sounds">sounds 音型</option>
            <option value="words">words 單字</option>
            <option value="phrases">phrases 句子</option>
          </select>
        </label>
        <label>
          音檔 key，例如 a / sh / cat
          <input value={audioKey} onChange={(e) => setAudioKey(e.target.value)} />
        </label>
        <label>
          選擇 mp3
          <input type="file" accept="audio/mpeg,audio/mp3" onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
      </div>
      <div className="audio-library-list">
        {Object.keys(currentItems).length ? Object.entries(currentItems).map(([key, item]) => (
          <div className="audio-row" key={key}>
            <div>
              <strong>{key}</strong>
              <span>{item.name || 'uploaded audio'} · {Math.round((item.size || 0) / 1024)} KB</span>
            </div>
            <div className="hero-buttons compact">
              <button className="btn secondary small" onClick={() => testAudio(key)}>試聽</button>
              <button className="btn danger small" onClick={() => removeAudio(key)}>刪除</button>
            </div>
          </div>
        )) : <p className="hint">這個類別還沒有上傳音檔。</p>}
      </div>
    </div>
  );
}

function TeacherView({ content, progress, setContent, onSave }) {
  const dashboard = content.teacherDashboard || {};
  const units = content.units || [];
  const roster = dashboard.roster || [];

  function updateDashboard(patch) {
    setContent({ ...content, teacherDashboard: { ...dashboard, ...patch } });
  }

  function toggleAssignment(unitId) {
    const assignments = new Set(dashboard.assignments || []);
    if (assignments.has(unitId)) assignments.delete(unitId);
    else assignments.add(unitId);
    updateDashboard({ assignments: [...assignments] });
  }

  return (
    <div className="progress-grid teacher-dashboard">
      <section className="panel passport-panel">
        <div className="section-title-row">
          <div>
            <h2>教師後台</h2>
            <p>查看班級概況、指派單元、查看錯題與管理示範學生名單。</p>
          </div>
          <span className="big-emoji">🏫</span>
        </div>
        <div className="admin-form-grid">
          <label>
            班級名稱
            <input value={dashboard.className || ''} onChange={(e) => updateDashboard({ className: e.target.value })} />
          </label>
          <label>
            教師備註 / 任務說明
            <textarea rows="3" value={dashboard.note || ''} onChange={(e) => updateDashboard({ note: e.target.value })} />
          </label>
        </div>
        <div className="passport-grid">
          <div><strong>{roster.length}</strong><span>學生數</span></div>
          <div><strong>{dashboard.assignments?.length || 0}</strong><span>已指派單元</span></div>
          <div><strong>{progress.mistakes?.length || 0}</strong><span>目前帳號錯題</span></div>
          <div><strong>{progress.stars || 0}</strong><span>目前帳號星星</span></div>
        </div>
      </section>

      <section className="panel">
        <h2>指派單元</h2>
        <p>勾選要給學生練習的單元。這些設定會跟網站內容一起保存。</p>
        <div className="unit-assignment-grid">
          {units.map((unit) => (
            <button key={unit.id} className={(dashboard.assignments || []).includes(unit.id) ? 'assigned' : ''} onClick={() => toggleAssignment(unit.id)}>
              <span>{unit.icon}</span>
              <strong>{unit.zh}</strong>
              <small>{unit.title}</small>
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={onSave}>儲存教師設定</button>
      </section>

      <section className="panel">
        <h2>班級學生概況</h2>
        <p>這版先提供示範名單與欄位架構；正式連接全班學生資料時，可再擴充為讀取 Supabase class_students。</p>
        <div className="teacher-table">
          <div className="teacher-table-head"><span>學生</span><span>完成</span><span>星星</span><span>錯題</span></div>
          {roster.map((student, index) => (
            <div className="teacher-table-row" key={`${student.email}-${index}`}>
              <span>{student.name}<small>{student.email}</small></span>
              <span>{student.completed}</span>
              <span>{student.stars}</span>
              <span>{student.mistakes}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel mistake-panel">
        <h2>目前帳號最近錯題</h2>
        {progress.mistakes?.length ? (
          <div className="mistake-list">
            {progress.mistakes.slice(-8).reverse().map((item) => (
              <div className="mistake-item" key={item.id}>
                <button onClick={() => speakPhonicsSound(item.expected, true)}>🔊</button>
                <div><strong>{item.expectedLabel || item.expected}</strong><span>誤選：{item.chosenLabel || item.chosen}</span></div>
              </div>
            ))}
          </div>
        ) : <p className="hint">目前沒有錯題。</p>}
      </section>
    </div>
  );
}

function AdminView({ content, setContent, onSave, onReset }) {
  const [section, setSection] = useState('site');
  const [unitIndex, setUnitIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [gameIndex, setGameIndex] = useState(0);

  const currentUnit = content.units[unitIndex] || content.units[0];
  const currentStory = content.stories[storyIndex] || content.stories[0];
  const currentGame = content.games[gameIndex] || content.games[0];

  function updateUnit(patch) {
    const next = clone(content);
    next.units[unitIndex] = { ...next.units[unitIndex], ...patch };
    setContent(next);
  }

  function updateStory(patch) {
    const next = clone(content);
    next.stories[storyIndex] = { ...next.stories[storyIndex], ...patch };
    setContent(next);
  }

  function updateGame(patch) {
    const next = clone(content);
    next.games[gameIndex] = { ...next.games[gameIndex], ...patch };
    setContent(next);
  }

  return (
    <section className="panel admin-panel">
      <div className="section-title-row">
        <div>
          <h2>管理員後台</h2>
          <p>可以調整版本號、首頁文案、12 個單元、故事、遊戲與管理員名單。資料會先保存到本機，若 Supabase 已建立 <code>site_content</code> 表，也會同步到雲端。</p>
        </div>
        <span className="big-emoji">🛠️</span>
      </div>

      <div className="chips large admin-tabs">
        {[
          ['site', '網站設定'],
          ['units', '單元管理'],
          ['stories', '故事管理'],
          ['games', '遊戲管理'],
          ['audio', '音檔管理'],
          ['teachers', '教師設定'],
          ['admins', '管理員名單'],
        ].map(([key, label]) => <button key={key} className={section === key ? 'active-chip' : ''} onClick={() => setSection(key)}>{label}</button>)}
      </div>

      {section === 'site' && (
        <div className="admin-form-grid">
          <label>
            版本號
            <input value={content.version} onChange={(e) => setContent({ ...content, version: e.target.value })} />
          </label>
          <label>
            今日任務文案
            <input value={content.hero.mission} onChange={(e) => setContent({ ...content, hero: { ...content.hero, mission: e.target.value } })} />
          </label>
          <label>
            首頁標題
            <input value={content.hero.title} onChange={(e) => setContent({ ...content, hero: { ...content.hero, title: e.target.value } })} />
          </label>
          <label>
            首頁副標
            <textarea rows="4" value={content.hero.subtitle} onChange={(e) => setContent({ ...content, hero: { ...content.hero, subtitle: e.target.value } })} />
          </label>
          <div className="admin-help-box">
            <strong>真人音檔資料夾規則</strong>
            <ul>
              <li>字母：<code>public/audio/letters/a.mp3</code></li>
              <li>音型：<code>public/audio/sounds/sh.mp3</code></li>
              <li>單字：<code>public/audio/words/cat.mp3</code></li>
            </ul>
          </div>
        </div>
      )}

      {section === 'units' && currentUnit && (
        <div className="admin-split">
          <div className="admin-list-col">
            <button className="btn secondary full" onClick={() => {
              const next = clone(content);
              next.units.push({
                id: `unit-${Date.now()}`,
                level: next.units.length + 1,
                icon: '✨',
                theme: 'pink',
                title: 'New Unit',
                zh: '新單元',
                description: '請編輯內容',
                patterns: ['sample'],
                words: ['sample'],
                learnTips: ['sample'],
                blendingSet: ['sample'],
                magicEPairs: [['cap', 'cape']],
                storyTitle: content.stories[0]?.title || '',
                audioFolder: 'words',
              });
              setContent(next);
              setUnitIndex(next.units.length - 1);
            }}>新增單元</button>
            {content.units.map((unit, idx) => <button key={unit.id} className={idx === unitIndex ? 'active-chip' : ''} onClick={() => setUnitIndex(idx)}>{unit.level}. {unit.zh}</button>)}
            <button className="btn danger full" onClick={() => {
              if (content.units.length <= 1) return;
              const next = clone(content);
              next.units.splice(unitIndex, 1);
              setContent(next);
              setUnitIndex(Math.max(0, unitIndex - 1));
            }}>刪除目前單元</button>
          </div>
          <div className="admin-editor-col">
            <div className="admin-form-grid">
              <label>id<input value={currentUnit.id} onChange={(e) => updateUnit({ id: e.target.value })} /></label>
              <label>level<input type="number" value={currentUnit.level} onChange={(e) => updateUnit({ level: Number(e.target.value) || 1 })} /></label>
              <label>icon<input value={currentUnit.icon} onChange={(e) => updateUnit({ icon: e.target.value })} /></label>
              <label>theme<input value={currentUnit.theme} onChange={(e) => updateUnit({ theme: e.target.value })} /></label>
              <label>英文標題<input value={currentUnit.title} onChange={(e) => updateUnit({ title: e.target.value })} /></label>
              <label>中文標題<input value={currentUnit.zh} onChange={(e) => updateUnit({ zh: e.target.value })} /></label>
              <label>描述<textarea rows="3" value={currentUnit.description} onChange={(e) => updateUnit({ description: e.target.value })} /></label>
              <label>learnTips（逗號或換行分隔）<textarea rows="3" value={currentUnit.learnTips.join('\n')} onChange={(e) => updateUnit({ learnTips: splitLines(e.target.value) })} /></label>
              <label>patterns（逗號或換行分隔）<textarea rows="4" value={currentUnit.patterns.join('\n')} onChange={(e) => updateUnit({ patterns: splitLines(e.target.value) })} /></label>
              <label>words（逗號或換行分隔）<textarea rows="4" value={currentUnit.words.join('\n')} onChange={(e) => updateUnit({ words: splitLines(e.target.value) })} /></label>
              <label>blendingSet（逗號或換行分隔）<textarea rows="3" value={currentUnit.blendingSet.join('\n')} onChange={(e) => updateUnit({ blendingSet: splitLines(e.target.value) })} /></label>
              <label>magicEPairs（每行一組，格式 cap|cape）<textarea rows="4" value={pairsToText(currentUnit.magicEPairs)} onChange={(e) => updateUnit({ magicEPairs: pairLinesToArray(e.target.value) })} /></label>
              <label>storyTitle<input value={currentUnit.storyTitle || ''} onChange={(e) => updateUnit({ storyTitle: e.target.value })} /></label>
              <label>audioFolder<input value={currentUnit.audioFolder || ''} onChange={(e) => updateUnit({ audioFolder: e.target.value })} /></label>
            </div>
          </div>
        </div>
      )}

      {section === 'stories' && currentStory && (
        <div className="admin-split">
          <div className="admin-list-col">
            <button className="btn secondary full" onClick={() => {
              const next = clone(content);
              next.stories.push({ id: `story-${Date.now()}`, title: 'New Story', level: 'New Level', text: 'Write your story.', focus: ['word'] });
              setContent(next);
              setStoryIndex(next.stories.length - 1);
            }}>新增故事</button>
            {content.stories.map((story, idx) => <button key={story.id} className={idx === storyIndex ? 'active-chip' : ''} onClick={() => setStoryIndex(idx)}>{story.title}</button>)}
            <button className="btn danger full" onClick={() => {
              if (content.stories.length <= 1) return;
              const next = clone(content);
              next.stories.splice(storyIndex, 1);
              setContent(next);
              setStoryIndex(Math.max(0, storyIndex - 1));
            }}>刪除目前故事</button>
          </div>
          <div className="admin-editor-col">
            <div className="admin-form-grid">
              <label>id<input value={currentStory.id} onChange={(e) => updateStory({ id: e.target.value })} /></label>
              <label>標題<input value={currentStory.title} onChange={(e) => updateStory({ title: e.target.value })} /></label>
              <label>level<input value={currentStory.level} onChange={(e) => updateStory({ level: e.target.value })} /></label>
              <label>focus words<textarea rows="3" value={currentStory.focus.join('\n')} onChange={(e) => updateStory({ focus: splitLines(e.target.value) })} /></label>
              <label>故事本文<textarea rows="8" value={currentStory.text} onChange={(e) => updateStory({ text: e.target.value })} /></label>
            </div>
          </div>
        </div>
      )}

      {section === 'games' && currentGame && (
        <div className="admin-split">
          <div className="admin-list-col">
            <button className="btn secondary full" onClick={() => {
              const next = clone(content);
              next.games.push({ id: `game-${Date.now()}`, title: 'New Game', zh: '新遊戲', icon: '🎮', skill: '新技能', type: 'sound-monster' });
              setContent(next);
              setGameIndex(next.games.length - 1);
            }}>新增遊戲</button>
            {content.games.map((game, idx) => <button key={game.id} className={idx === gameIndex ? 'active-chip' : ''} onClick={() => setGameIndex(idx)}>{game.title}</button>)}
            <button className="btn danger full" onClick={() => {
              if (content.games.length <= 1) return;
              const next = clone(content);
              next.games.splice(gameIndex, 1);
              setContent(next);
              setGameIndex(Math.max(0, gameIndex - 1));
            }}>刪除目前遊戲</button>
          </div>
          <div className="admin-editor-col">
            <div className="admin-form-grid">
              <label>id<input value={currentGame.id} onChange={(e) => updateGame({ id: e.target.value })} /></label>
              <label>icon<input value={currentGame.icon} onChange={(e) => updateGame({ icon: e.target.value })} /></label>
              <label>title<input value={currentGame.title} onChange={(e) => updateGame({ title: e.target.value })} /></label>
              <label>zh<input value={currentGame.zh} onChange={(e) => updateGame({ zh: e.target.value })} /></label>
              <label>skill<input value={currentGame.skill} onChange={(e) => updateGame({ skill: e.target.value })} /></label>
              <label>type
                <select value={currentGame.type} onChange={(e) => updateGame({ type: e.target.value })}>
                  <option value="sound-monster">sound-monster</option>
                  <option value="word-train">word-train</option>
                  <option value="magic-lab">magic-lab</option>
                  <option value="fishing">fishing</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {section === 'audio' && (
        <AudioUploadManager content={content} setContent={setContent} />
      )}

      {section === 'teachers' && (
        <div className="admin-form-grid">
          <label>
            教師 Email（每行一個）
            <textarea rows="5" value={(content.teacherEmails || []).join('\n')} onChange={(e) => setContent({ ...content, teacherEmails: splitLines(e.target.value) })} />
          </label>
          <label>
            班級名稱
            <input value={content.teacherDashboard?.className || ''} onChange={(e) => setContent({ ...content, teacherDashboard: { ...(content.teacherDashboard || {}), className: e.target.value } })} />
          </label>
          <label>
            教師備註 / 任務說明
            <textarea rows="3" value={content.teacherDashboard?.note || ''} onChange={(e) => setContent({ ...content, teacherDashboard: { ...(content.teacherDashboard || {}), note: e.target.value } })} />
          </label>
          <div className="admin-help-box">
            <strong>教師後台說明</strong>
            <ul>
              <li>教師登入後會看到「教師」分頁。</li>
              <li>教師可以查看班級概況、指派單元、查看目前帳號錯題。</li>
              <li>正式全班資料同步可在下一版接 class_students 與全班 progress 查詢。</li>
            </ul>
          </div>
        </div>
      )}

      {section === 'admins' && (
        <div className="admin-form-grid">
          <label>
            管理員 Email（每行一個）
            <textarea rows="6" value={(content.adminEmails || []).join('\n')} onChange={(e) => setContent({ ...content, adminEmails: splitLines(e.target.value) })} />
          </label>
          <div className="admin-help-box">
            <strong>使用說明</strong>
            <ul>
              <li>請先用一般帳號登入。</li>
              <li>把自己的 Email 加到管理員名單，儲存後重新登入即可看到後台。</li>
              <li>若使用 Supabase，請執行 <code>database/supabase_admin.sql</code> 啟用雲端內容管理。</li>
            </ul>
          </div>
        </div>
      )}

      <div className="hero-buttons compact admin-actions">
        <button className="btn primary" onClick={onSave}>儲存網站內容</button>
        <button className="btn secondary" onClick={onReset}>重設為預設內容</button>
      </div>
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState('map');
  const [search, setSearch] = useState('');
  const [siteContent, setSiteContent] = useState(defaultSiteContent);
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
      const mergedContent = mergeSiteContent(content);
      setSiteContent(mergedContent);
      setAudioLibrary(mergedContent.audioLibrary || {});
      setSelectedUnitId(mergedContent.units[0]?.id || 'alphabet');
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
    const timer = setTimeout(() => {
      saveProgress(progress).catch((error) => console.warn('saveProgress failed', error));
    }, 300);
    return () => clearTimeout(timer);
  }, [progress, ready]);

  const units = siteContent.units || [];
  const stories = siteContent.stories || [];
  const games = siteContent.games || [];
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) || units[0];
  const isAdmin = isAdminUser(user, siteContent);
  const isTeacher = isTeacherUser(user, siteContent);

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
      next.badges = addBadgeIfNeeded(next, unitId);
      return next;
    });
    setMessage(`已完成 ${unit?.zh || unitId}，獲得 10 顆星星！`);
  }

  function handleMistake(item) {
    setProgress((prev) => ({ ...mergeProgress(prev), mistakes: [...(prev.mistakes || []), item].slice(-30) }));
  }

  function handleClearMistakes() {
    setProgress((prev) => ({ ...prev, mistakes: [] }));
    setMessage('已清空錯題本。');
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
    const merged = await saveSiteContent(siteContent);
    setSiteContent(merged);
    setMessage('網站內容已儲存。');
  }

  function handleResetContent() {
    const restored = resetSiteContent();
    setSiteContent(restored);
    setSelectedUnitId(restored.units[0]?.id || 'alphabet');
    setMessage('已重設為預設內容。');
  }

  const percent = completedPercent(progress, units.length || 12);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">🦊</div>
          <div>
            <h1>Phonics Adventure</h1>
            <p>英文自然發音冒險</p>
          </div>
        </div>
        <nav>
          {[
            ['map', '學習地圖'],
            ['learn', '學習'],
            ['games', '遊戲'],
            ['read', '閱讀'],
            ['progress', '進度'],
            ...(isTeacher ? [['teacher', '教師']] : []),
            ...(isAdmin ? [['admin', '管理']] : []),
          ].map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
        </nav>
        <div className="topbar-right">
          <UserMenu user={user} isAdmin={isAdmin} isTeacher={isTeacher} onAuth={handleAuth} onSignOut={handleSignOut} message={message} />
          <div className="student-pill">⭐ {progress.stars} Stars</div>
        </div>
      </header>

      <main>
        <section className="hero compact-hero">
          <div className="hero-copy">
            <div className="hero-topline">
              <span className="notice">{siteContent.hero.mission}</span>
              <span className="version-pill">版本 {siteContent.version}</span>
            </div>
            <h2>{siteContent.hero.title}</h2>
            <p>{siteContent.hero.subtitle}</p>
            <div className="hero-buttons four">
              <button className="btn dark" onClick={() => setTab('learn')}>開始學習</button>
              <button className="btn secondary" onClick={() => setTab('map')}>學習地圖</button>
              <button className="btn pink" onClick={() => setTab('games')}>玩遊戲</button>
              <button className="btn primary" onClick={() => setTab('progress')}>我的進度</button>
            </div>
          </div>
          <div className="hero-side compact">
            <ProgressCircle progress={progress} total={units.length || 12} />
            <div className="summary-card"><strong>{Object.keys(progress.completedUnits || {}).length}</strong><span>已完成單元</span></div>
            <div className="summary-card"><strong>{progress.streakDays || 0}</strong><span>連續學習天數</span></div>
            <div className="summary-card"><strong>{progress.mistakes?.length || 0}</strong><span>錯題待複習</span></div>
            <div className="summary-card"><strong>{percent}%</strong><span>總完成率</span></div>
          </div>
        </section>

        <div className="message-strip">{message}</div>

        {tab === 'map' && <MapView units={units} progress={progress} selectedUnit={selectedUnit} setSelectedUnit={(unit) => setSelectedUnitId(unit.id)} setTab={setTab} search={search} setSearch={setSearch} />}
        {tab === 'learn' && selectedUnit && <LearnView unit={selectedUnit} stories={stories} progress={progress} onPractice={handlePractice} onComplete={handleComplete} />}
        {tab === 'games' && <GamesView games={games} onPractice={handlePractice} onMistake={handleMistake} />}
        {tab === 'read' && <ReadView stories={stories} onPractice={handlePractice} />}
        {tab === 'progress' && <ProgressView progress={progress} units={units} onClearMistakes={handleClearMistakes} />}
        {tab === 'teacher' && isTeacher && <TeacherView content={siteContent} progress={progress} setContent={setSiteContent} onSave={handleSaveContent} />}
        {tab === 'admin' && isAdmin && <AdminView content={siteContent} setContent={setSiteContent} onSave={handleSaveContent} onReset={handleResetContent} />}
      </main>
    </div>
  );
}
