import { useEffect, useMemo, useState } from 'react';
import { phonicsUnits, stories, games } from './data/phonics.js';
import { alphabetSounds, getSoundEntry, getSoundSymbol } from './data/sounds.js';
import { speakText, speakWord, speakPhonicsSound, speakBlendWord, speakPattern } from './utils/speech.js';
import { getCurrentUser, getProviderStatus, loadProgress, saveProgress, signIn, signOut, signUp } from './services/syncService.js';

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

const featuredBadges = [
  { key: 'alphabet', name: 'Alphabet Master', icon: '🔤' },
  { key: 'short-vowels', name: 'Short Vowel Hero', icon: '🍎' },
  { key: 'cvc', name: 'Blending Star', icon: '🧱' },
  { key: 'magic-e', name: 'Magic E Wizard', icon: '🪄' },
  { key: 'reader', name: 'Reading Explorer', icon: '📚' },
  { key: 'r-controlled', name: 'Bossy R Hero', icon: '🦁' },
];

const unitToStoryLevel = {
  alphabet: 'Short a / CVC',
  'short-vowels': 'Short a / CVC',
  cvc: 'Short a / CVC',
  'word-families': 'Short a / CVC',
  blends: 'Digraph sh / short i',
  digraphs: 'Digraph sh / short i',
  'magic-e': 'Silent e',
  'long-vowels': 'Silent e',
  'vowel-teams': 'Silent e',
  'r-controlled': 'Silent e',
  diphthongs: 'Silent e',
};

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

function getYesterdayString(base) {
  const date = new Date(base);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function addBadgeIfNeeded(progress, key) {
  if (progress.badges.includes(key)) return progress.badges;
  return [...progress.badges, key];
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
    practiceCount: (progress.practiceCount || 0) + 1,
    lastPracticed: new Date().toISOString(),
    streakDays,
    readingLog: skill === 'reader' ? (progress.readingLog || 0) + 1 : (progress.readingLog || 0),
    practiceWords,
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

function HeroActions({ setTab }) {
  return (
    <div className="hero-buttons four">
      <button className="btn dark" onClick={() => setTab('learn')}>開始學習</button>
      <button className="btn secondary" onClick={() => setTab('review')}>複習練習</button>
      <button className="btn pink" onClick={() => setTab('games')}>玩遊戲</button>
      <button className="btn primary" onClick={() => setTab('progress')}>我的進度</button>
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

function UnitFlow() {
  const steps = ['Learn', 'Practice', 'Game', 'Read', 'Check'];
  return (
    <section className="panel flow-panel">
      <div className="section-title-row">
        <div>
          <h2>本單元流程</h2>
          <p>固定的學習節奏可降低焦慮，幫助小學生安心完成任務。</p>
        </div>
        <span className="big-emoji">🧭</span>
      </div>
      <div className="flow-steps">
        {steps.map((step, index) => (
          <div className="flow-step" key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function InteractiveBlender({ onPractice }) {
  const presets = ['cat', 'map', 'pig', 'dog', 'bus', 'sit', 'hot', 'hen', 'run'];
  const [word, setWord] = useState('cat');
  const letters = word.split('');

  function playLetter(letter) {
    speakPhonicsSound(letter, true);
    onPractice('alphabet', letter);
  }

  function blend() {
    speakBlendWord(word);
    onPractice('cvc', word);
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
            <span>{getSoundSymbol(letter)}</span>
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
    speakWord(next ? pair[1] : pair[0]);
    onPractice('magic-e', next ? pair[1] : pair[0]);
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

function LetterSoundBoard({ onPractice }) {
  return (
    <section className="panel sound-board-panel">
      <div className="section-title-row">
        <div>
          <h2>Letter Sound Board 字母音板</h2>
          <p>點 A-Z 時會讀 phonics sound，不再讀字母名稱。每張卡都有 IPA 與代表單字。</p>
        </div>
        <span className="big-emoji">🔤</span>
      </div>
      <div className="sound-board-grid">
        {alphabetSounds.map((item) => (
          <button
            className="sound-card"
            key={item.key}
            onClick={() => { speakPhonicsSound(item.key, true); onPractice('alphabet', item.example); }}
            title={`${item.letter} ${item.symbol} ${item.example}`}
          >
            <span className="sound-picture">{item.picture}</span>
            <strong>{item.letter.toLowerCase()}</strong>
            <em>{item.symbol}</em>
            <small>{item.example}</small>
          </button>
        ))}
      </div>
      <p className="hint">說明：瀏覽器語音不是專業錄音，這版會用近似音 + 代表單字處理，例如 a 會播放「ă / apple」，不是字母名 A。之後可再換成真人 mp3 音檔。</p>
    </section>
  );
}

function ShortVowelSort({ onPractice, onMistake }) {
  const wordBank = [
    { word: 'cat', group: 'short a' },
    { word: 'bed', group: 'short e' },
    { word: 'pig', group: 'short i' },
    { word: 'dog', group: 'short o' },
    { word: 'sun', group: 'short u' },
  ];
  const [target, setTarget] = useState(wordBank[0]);
  const groups = ['short a', 'short e', 'short i', 'short o', 'short u'];

  function next() {
    setTarget(wordBank[Math.floor(Math.random() * wordBank.length)]);
  }

  function choose(group) {
    if (group === target.group) {
      speakWord(target.word);
      onPractice('short-vowels', target.word);
      next();
      return;
    }
    onMistake({
      id: `${Date.now()}-vowel-${target.word}`,
      skill: 'Short Vowels',
      expected: target.group,
      expectedLabel: target.group,
      chosen: group,
      chosenLabel: group,
      createdAt: new Date().toISOString(),
    });
    speakPattern(`${target.group}: ${target.word}`);
  }

  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>短母音分類遊戲</h2>
          <p>聽單字、看單字，選出它屬於哪一個短母音房間。</p>
        </div>
        <span className="big-emoji">🏠</span>
      </div>
      <div className="practice-center">
        <button className="practice-word" onClick={() => speakWord(target.word)}>{target.word} 🔊</button>
        <div className="option-grid five">
          {groups.map((group) => <button key={group} onClick={() => choose(group)}>{group}</button>)}
        </div>
      </div>
    </section>
  );
}

function WordFamilyTrain({ onPractice }) {
  const families = {
    '-at': ['cat', 'hat', 'mat', 'sat'],
    '-an': ['fan', 'man', 'pan', 'can'],
    '-ig': ['pig', 'wig', 'big', 'dig'],
    '-op': ['hop', 'mop', 'top', 'pop'],
    '-ug': ['bug', 'rug', 'mug', 'hug'],
  };
  const familyKeys = Object.keys(families);
  const [family, setFamily] = useState(familyKeys[0]);
  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>Word Family Train</h2>
          <p>用押韻火車認識同一家族的單字。</p>
        </div>
        <span className="big-emoji">🚂</span>
      </div>
      <div className="chips large">
        {familyKeys.map((item) => <button key={item} onClick={() => setFamily(item)}>{item}</button>)}
      </div>
      <div className="train-row">
        {families[family].map((word) => (
          <button className="train-car" key={word} onClick={() => { speakWord(word); onPractice('word-families', word); }}>
            <span>🚃</span>
            <strong>{word}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function PatternExplorer({ unit, onPractice }) {
  const [pattern, setPattern] = useState(unit.patterns[0]);
  const relatedWords = useMemo(() => {
    const key = String(pattern).split(/[:\s]/)[0].replace(/[^a-z]/gi, '').toLowerCase();
    return unit.words.filter((word) => key && word.toLowerCase().includes(key)).slice(0, 6);
  }, [pattern, unit.words]);

  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>音型探索卡</h2>
          <p>點音型、聽例字，建立規則與單字的連結。</p>
        </div>
        <span className="big-emoji">🧩</span>
      </div>
      <div className="chips large">
        {unit.patterns.map((item) => <button key={item} onClick={() => { setPattern(item); speakPattern(item); onPractice(unit.id, item); }}>{item}</button>)}
      </div>
      <div className="explorer-box">
        <div>
          <strong>目前音型</strong>
          <p>{pattern}</p>
        </div>
        <div className="word-grid compact">
          {(relatedWords.length ? relatedWords : unit.words.slice(0, 6)).map((word) => (
            <button key={word} onClick={() => { speakWord(word); onPractice(unit.id, word); }}>{word}<span>🔊</span></button>
          ))}
        </div>
      </div>
    </section>
  );
}

function UnitReadBridge({ selectedUnit, onPractice }) {
  const story = stories.find((item) => item.level === unitToStoryLevel[selectedUnit.id]) || stories[0];
  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>Read 閱讀小橋樑</h2>
          <p>學完音型後，立刻讀一小段故事，把拼讀連到閱讀理解。</p>
        </div>
        <span className="big-emoji">📖</span>
      </div>
      <p className="story-text bridge-story">{story.text}</p>
      <div className="chips large">
        {story.focus.map((word) => <button key={word} onClick={() => { speakWord(word); onPractice('reader', word); }}>{word} 🔊</button>)}
      </div>
      <button className="btn secondary" onClick={() => { speakText(story.text); onPractice('reader', story.title); }}>朗讀本段故事</button>
    </section>
  );
}

function UnitCheckCard({ selectedUnit, progress, onComplete }) {
  const done = progress.completedUnits?.[selectedUnit.id];
  return (
    <section className="panel check-panel">
      <div className="section-title-row">
        <div>
          <h2>Check 單元檢核</h2>
          <p>完成本單元後可獲得星星、貼紙與徽章進度。</p>
        </div>
        <span className="big-emoji">✅</span>
      </div>
      <ul className="check-list">
        <li>聽過至少 3 個音型</li>
        <li>練習過單字卡或互動活動</li>
        <li>完成一個小遊戲或閱讀任務</li>
      </ul>
      <button className="btn primary full" onClick={() => onComplete(selectedUnit.id)}>{done ? '已完成本單元 ⭐' : '完成本單元，獲得星星 ⭐'}</button>
    </section>
  );
}

function PracticeHub({ selectedUnit, onPractice, onMistake }) {
  if (selectedUnit.id === 'alphabet') return <LetterSoundBoard onPractice={onPractice} />;
  if (selectedUnit.id === 'short-vowels') return <ShortVowelSort onPractice={onPractice} onMistake={onMistake} />;
  if (selectedUnit.id === 'cvc') return <InteractiveBlender onPractice={onPractice} />;
  if (selectedUnit.id === 'word-families') return <WordFamilyTrain onPractice={onPractice} />;
  if (selectedUnit.id === 'magic-e') return <MagicE onPractice={onPractice} />;
  return <PatternExplorer unit={selectedUnit} onPractice={onPractice} />;
}

function LearnView({ selectedUnit, progress, onPractice, onMistake, onComplete }) {
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
          {selectedUnit.patterns.map((pattern) => <button key={pattern} onClick={() => { speakPattern(pattern); onPractice(selectedUnit.id, pattern); }}>🔊 {pattern}</button>)}
        </div>
        <h3>單字卡</h3>
        <div className="word-grid">
          {selectedUnit.words.map((word) => <button key={word} onClick={() => { speakWord(word); onPractice(selectedUnit.id, word); }}>{word}<span>🔊</span></button>)}
        </div>
      </section>
      <div className="stack">
        <UnitFlow />
        <PracticeHub selectedUnit={selectedUnit} onPractice={onPractice} onMistake={onMistake} />
        {selectedUnit.id !== 'cvc' && <InteractiveBlender onPractice={onPractice} />}
        {selectedUnit.id !== 'magic-e' && selectedUnit.id !== 'alphabet' && <MagicE onPractice={onPractice} />}
        <UnitReadBridge selectedUnit={selectedUnit} onPractice={onPractice} />
        <UnitCheckCard selectedUnit={selectedUnit} progress={progress} onComplete={onComplete} />
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
          <h2>Phonics Island 學習地圖</h2>
          <p>學生可以從第一站開始闖關，依序完成字母音、短母音、CVC、blends、digraphs、Magic E、vowel teams 與閱讀小故事。</p>
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

function makeQuizRound(previousKey) {
  let target = alphabetSounds[Math.floor(Math.random() * alphabetSounds.length)];
  if (previousKey && alphabetSounds.length > 1) {
    let guard = 0;
    while (target.key === previousKey && guard < 10) {
      target = alphabetSounds[Math.floor(Math.random() * alphabetSounds.length)];
      guard += 1;
    }
  }
  const others = alphabetSounds.filter((item) => item.key !== target.key).sort(() => Math.random() - 0.5).slice(0, 3);
  const choices = [...others, target].sort(() => Math.random() - 0.5);
  return { target, choices, result: '' };
}

function SoundMonsterGame({ onPractice, onMistake }) {
  const [round, setRound] = useState(() => makeQuizRound());

  function playTarget() {
    speakPhonicsSound(round.target.key, false);
  }

  function choose(choice) {
    const correct = choice.key === round.target.key;
    if (correct) {
      speakWord(choice.example);
      onPractice('sound-monster', choice.example);
      setRound({ ...round, result: `答對了！${choice.letter} says ${choice.symbol} as in ${choice.example}.` });
    } else {
      speakPhonicsSound(round.target.key, true);
      onMistake({
        id: `${Date.now()}-${round.target.key}`,
        skill: 'Letter sounds',
        expected: round.target.key,
        expectedLabel: `${round.target.letter} ${round.target.symbol}`,
        chosen: choice.key,
        chosenLabel: `${choice.letter} ${choice.symbol}`,
        createdAt: new Date().toISOString(),
      });
      setRound({ ...round, result: `再試一次：這個聲音是 ${round.target.letter.toLowerCase()} ${round.target.symbol}，不是 ${choice.letter.toLowerCase()}。` });
    }
  }

  function nextRound() {
    setRound(makeQuizRound(round.target.key));
  }

  return (
    <section className="panel monster-panel">
      <div className="section-title-row">
        <div>
          <h2>Sound Monster 聽音選字母</h2>
          <p>按播放，聽 phonics sound，再選正確字母。答錯會自動加入錯題本。</p>
        </div>
        <span className="big-emoji">👾</span>
      </div>
      <div className="monster-stage">
        <button className="monster-button" onClick={playTarget}>🔊 播放聲音</button>
        <div className="quiz-options">
          {round.choices.map((choice) => (
            <button key={choice.key} onClick={() => choose(choice)} className="quiz-choice">
              <span>{choice.picture}</span>
              <strong>{choice.letter.toLowerCase()}</strong>
              <em>{choice.symbol}</em>
            </button>
          ))}
        </div>
        {round.result && <p className="quiz-result">{round.result}</p>}
        <button className="btn dark" onClick={nextRound}>下一題</button>
      </div>
    </section>
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
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>Word Train 單字火車</h2>
          <p>找出同一家族的單字，讓火車順利出發。</p>
        </div>
        <span className="big-emoji">🚂</span>
      </div>
      <div className="practice-center">
        <p>請找出屬於 <strong>{round.family}</strong> 的單字：</p>
        <div className="option-grid four">
          {round.choices.map((word) => (
            <button key={word} onClick={() => { speakWord(word); onPractice('word-train', word); }}>
              {word}
            </button>
          ))}
        </div>
        <p className="hint">正確家族：{round.answer.join(', ')}</p>
        <button className="btn secondary" onClick={() => setIndex((prev) => (prev + 1) % rounds.length)}>換一題</button>
      </div>
    </section>
  );
}

function MagicELabGame({ onPractice }) {
  const pairs = [['cap', 'cape'], ['hop', 'hope'], ['cub', 'cube'], ['pin', 'pine']];
  const [pairIndex, setPairIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [base, transformed] = pairs[pairIndex];
  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>Magic E Lab</h2>
          <p>幫短母音單字加上 e，看看它如何變身成長母音單字。</p>
        </div>
        <span className="big-emoji">🧪</span>
      </div>
      <div className="magic-lab-grid">
        <button className="practice-word" onClick={() => { speakWord(base); onPractice('magic-e', base); }}>{base}</button>
        <span className="arrow">＋ e →</span>
        <button className="practice-word success" onClick={() => { speakWord(transformed); onPractice('magic-e', transformed); setShowAnswer(true); }}>
          {showAnswer ? transformed : '????'}
        </button>
      </div>
      <div className="hero-buttons compact">
        <button className="btn secondary" onClick={() => setShowAnswer(!showAnswer)}>{showAnswer ? '隱藏答案' : '看答案'}</button>
        <button className="btn dark" onClick={() => { setPairIndex((pairIndex + 1) % pairs.length); setShowAnswer(false); }}>下一組</button>
      </div>
    </section>
  );
}

function GamesView({ onPractice, onMistake }) {
  return (
    <section>
      <div className="section-heading simple">
        <div>
          <h2>遊戲練習區</h2>
          <p>每個遊戲只練一個明確技能，降低操作難度。</p>
        </div>
      </div>
      <SoundMonsterGame onPractice={onPractice} onMistake={onMistake} />
      <div className="game-feature-grid">
        <WordTrainGame onPractice={onPractice} />
        <MagicELabGame onPractice={onPractice} />
      </div>
      <div className="game-grid">
        {games.map((game) => (
          <article className="game-card" key={game.title}>
            <span className="game-icon">{game.icon}</span>
            <h3>{game.title}</h3>
            <p><strong>{game.zh}</strong></p>
            <p>技能：{game.skill}</p>
            <button className="btn dark full" onClick={() => onPractice(game.title, game.skill)}>開始挑戰</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ClickableStory({ text, onPractice }) {
  const tokens = text.split(/(\s+)/);
  return (
    <p className="story-text clickable-story">
      {tokens.map((token, index) => {
        if (/^\s+$/.test(token)) return token;
        const clean = token.replace(/[^a-zA-Z]/g, '');
        if (!clean) return token;
        return (
          <button key={`${token}-${index}`} onClick={() => { speakWord(clean); onPractice('reader', clean); }}>
            {token}
          </button>
        );
      })}
    </p>
  );
}

function ReadView({ onPractice }) {
  return (
    <div className="read-grid">
      <section className="panel">
        <h2>Sight Words + Decodable Readers</h2>
        <p>故事只使用學生已學過的音型，讓 Phonics 連到真正閱讀。每個單字都能點擊發音。</p>
        <div className="story-list">
          {stories.map((story) => (
            <article className="story-card" key={story.title}>
              <div className="story-top">
                <h3>{story.title}</h3>
                <span>{story.level}</span>
              </div>
              <ClickableStory text={story.text} onPractice={onPractice} />
              <div className="chips large">
                {story.focus.map((word) => <button key={word} onClick={() => { speakWord(word); onPractice('reader', word); }}>{word} 🔊</button>)}
              </div>
              <div className="hero-buttons compact">
                <button className="btn primary" onClick={() => { speakText(story.text); onPractice('reader', story.title); }}>朗讀全文</button>
                <button className="btn secondary" onClick={() => onPractice('reader', `quiz-${story.title}`)}>完成小測驗</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel mic-panel">
        <span className="big-emoji">🎙️</span>
        <h2>跟讀錄音</h2>
        <p>正式版可以加入錄音上傳或 Web Speech API 評估。這個原型先保留互動入口與學習紀錄。</p>
        <button className="btn pink full" onClick={() => onPractice('recording', 'voice practice')}>按住錄音</button>
      </section>
    </div>
  );
}

function ReviewView({ progress, onPractice, onClearMistakes }) {
  const frequentWords = Object.entries(progress.practiceWords || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const reviewWords = progress.mistakes?.slice(-5).map((item) => item.expected).filter(Boolean) || [];
  const uniqueReview = [...new Set(reviewWords)];
  return (
    <div className="progress-grid">
      <section className="panel passport-panel">
        <div className="section-title-row">
          <div>
            <h2>我的 Phonics Passport</h2>
            <p>整理已完成單元、星星、今日任務、連續學習天數與常練單字。</p>
          </div>
          <span className="big-emoji">🛂</span>
        </div>
        <div className="passport-grid">
          <div><strong>{Object.keys(progress.completedUnits || {}).length}</strong><span>已完成單元</span></div>
          <div><strong>{progress.stars || 0}</strong><span>星星數</span></div>
          <div><strong>{progress.streakDays || 0}</strong><span>連續學習天數</span></div>
          <div><strong>{progress.practiceCount || 0}</strong><span>總練習次數</span></div>
        </div>
        <div className="daily-mission">
          <strong>今日任務</strong>
          <ul>
            <li>{(progress.practiceCount || 0) >= 3 ? '✅' : '⬜'} 練習 3 次 phonics</li>
            <li>{(progress.readingLog || 0) >= 1 ? '✅' : '⬜'} 閱讀 1 則小故事</li>
            <li>{(progress.mistakes?.length || 0) === 0 ? '✅' : '⬜'} 複習最近錯題</li>
          </ul>
        </div>
      </section>
      <section className="panel">
        <div className="section-title-row">
          <div>
            <h2>錯題自動複習</h2>
            <p>學生常錯的音會自動出現在每日任務。</p>
          </div>
          <button className="btn secondary" onClick={onClearMistakes}>清空錯題</button>
        </div>
        <div className="chips large">
          {uniqueReview.length ? uniqueReview.map((item) => {
            const entry = getSoundEntry(item);
            return <button key={item} onClick={() => { speakPhonicsSound(item, true); onPractice('review', item); }}>{entry?.picture || '🔊'} {item}</button>;
          }) : <span className="empty-chip">目前沒有錯題，太棒了！</span>}
        </div>
        <h3>常練單字</h3>
        <div className="chips large">
          {frequentWords.length ? frequentWords.map(([word, count]) => <button key={word} onClick={() => { speakWord(word); onPractice('review', word); }}>{word} · {count}</button>) : <span className="empty-chip">開始練習後，這裡會顯示常練單字。</span>}
        </div>
      </section>
    </div>
  );
}

function ProgressView({ progress, user, onClearMistakes }) {
  const completedIds = Object.keys(progress.completedUnits || {});
  const badges = featuredBadges.map((badge) => [badge.name, badge.icon, progress.badges.includes(badge.key) || completedIds.includes(badge.key)]);

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

      <section className="panel mistake-panel">
        <div className="section-title-row">
          <div>
            <h2>錯題本</h2>
            <p>答錯的 phonics sound 會出現在這裡，方便每日複習。</p>
          </div>
          <span className="big-emoji">📝</span>
        </div>
        {progress.mistakes?.length ? (
          <div className="mistake-list">
            {progress.mistakes.slice(-8).reverse().map((item) => {
              const expected = getSoundEntry(item.expected);
              return (
                <div className="mistake-item" key={item.id}>
                  <button onClick={() => speakPhonicsSound(item.expected, true)}>{expected?.picture || '🔊'}</button>
                  <div>
                    <strong>{item.expectedLabel || item.expected}</strong>
                    <span>誤選：{item.chosenLabel || item.chosen || '未知'} · {item.skill}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="hint">目前沒有錯題，繼續保持！</p>}
      </section>

      <section className="panel badge-panel teacher-panel">
        <div className="section-title-row">
          <div>
            <h2>教師 / 家長功能示意</h2>
            <p>正式版可擴充班級排行榜、指派單元、列印 worksheet、匯出報告。</p>
          </div>
          <span className="big-emoji">👨‍👩‍👧‍👦</span>
        </div>
        <div className="mini-grid teacher-grid">
          <div><strong>查看學生進度</strong><span>完成率、星星數、連續學習天數</span></div>
          <div><strong>查看錯題</strong><span>最近常錯的字母音與音型</span></div>
          <div><strong>指派單元</strong><span>例如 short a、Magic E、Bossy R</span></div>
          <div><strong>匯出報告</strong><span>可延伸為 CSV / PDF</span></div>
        </div>
        <h3>徽章收藏</h3>
        <div className="badge-grid">
          {badges.map(([name, icon, earned]) => (
            <div className={`badge ${earned ? 'earned' : ''}`} key={name}>
              <span>{icon}</span>
              <strong>{name}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('map');
  const [selectedUnit, setSelectedUnit] = useState(phonicsUnits[0]);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(defaultProgress);
  const [message, setMessage] = useState('歡迎來到 Phonics Adventure！');

  useEffect(() => {
    let mounted = true;
    async function init() {
      const currentUser = await getCurrentUser();
      const remoteProgress = await loadProgress();
      if (!mounted) return;
      setUser(currentUser);
      setProgress(mergeProgress(remoteProgress));
    }
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveProgress(progress).catch((error) => console.warn('saveProgress failed', error));
    }, 300);
    return () => clearTimeout(timer);
  }, [progress]);

  function handlePractice(skill, word = '') {
    setProgress((prev) => mergeProgress(updatePracticeProgress(prev, skill, word)));
  }

  function handleComplete(unitId) {
    const selected = phonicsUnits.find((unit) => unit.id === unitId);
    setProgress((prev) => {
      const next = mergeProgress(prev);
      const alreadyDone = Boolean(next.completedUnits?.[unitId]);
      next.completedUnits = { ...next.completedUnits, [unitId]: true };
      if (!alreadyDone) next.stars += 10;
      next.badges = addBadgeIfNeeded(next, unitId);
      if (unitId === 'alphabet' || unitId === 'cvc' || unitId === 'magic-e' || unitId === 'r-controlled') {
        next.badges = addBadgeIfNeeded(next, unitId);
      }
      if ((next.readingLog || 0) > 0) next.badges = addBadgeIfNeeded(next, 'reader');
      return { ...next };
    });
    setMessage(`太棒了！你完成了 ${selected?.zh || unitId}，獲得 10 顆星星。`);
  }

  function handleMistake(item) {
    setProgress((prev) => {
      const next = mergeProgress(prev);
      next.mistakes = [...next.mistakes, item].slice(-30);
      return { ...next };
    });
  }

  function handleClearMistakes() {
    setProgress((prev) => ({ ...prev, mistakes: [] }));
    setMessage('已清空錯題本。');
  }

  const completedCount = Object.keys(progress.completedUnits || {}).length;
  const frequentWords = Object.entries(progress.practiceWords || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);

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
            ['review', '複習練習'],
            ['games', '遊戲'],
            ['read', '閱讀'],
            ['progress', '進度'],
          ].map(([key, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
          ))}
        </nav>
        <div className="student-pill">⭐ {progress.stars} Stars</div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="notice">✨ 今日任務：完成 2 次練習 + 1 次閱讀</div>
            <h2>Phonics Island / 自然發音島</h2>
            <p>這個網站以遊戲化學習地圖為核心，從字母音、短母音、CVC、單字家族、子音混合、二合字母，到 Magic E、長母音、vowel teams、Bossy R、雙母音與閱讀故事，讓學生像闖關一樣完成完整 phonics 旅程。</p>
            <HeroActions setTab={setTab} />
          </div>
          <div className="hero-side">
            <ProgressCircle progress={progress} />
            <div className="summary-card"><strong>{completedCount}</strong><span>已完成單元</span></div>
            <div className="summary-card"><strong>{progress.streakDays || 0}</strong><span>連續學習天數</span></div>
            <div className="summary-card"><strong>{progress.mistakes?.length || 0}</strong><span>錯題待複習</span></div>
          </div>
        </section>

        <div className="message-strip">{message}</div>

        <section className="dashboard-grid">
          <AuthPanel user={user} onUserChange={setUser} onMessage={setMessage} />
          <section className="panel overview-panel">
            <div className="section-title-row">
              <div>
                <h2>首頁快速入口</h2>
                <p>畫面採用明亮、圓角、可愛且圖案豐富的卡片式設計，並把學習、遊戲、閱讀與進度分區清楚呈現。</p>
              </div>
              <span className="big-emoji">🦉</span>
            </div>
            <div className="mini-grid big-links">
              <button onClick={() => setTab('learn')}><strong>開始學習</strong><span>進入目前單元與互動拼讀板</span></button>
              <button onClick={() => setTab('review')}><strong>複習練習</strong><span>查看錯題本與每日任務</span></button>
              <button onClick={() => setTab('games')}><strong>玩遊戲</strong><span>Sound Monster、Word Train、Magic E Lab</span></button>
              <button onClick={() => setTab('progress')}><strong>我的進度</strong><span>Phonics Passport、徽章與報告</span></button>
            </div>
            <div className="chips large">
              {frequentWords.length ? frequentWords.map(([word, count]) => <span key={word}>{word} × {count}</span>) : <span>開始練習後會顯示常練單字</span>}
            </div>
          </section>
        </section>

        {tab === 'map' && <MapView progress={progress} selectedUnit={selectedUnit} setSelectedUnit={setSelectedUnit} setTab={setTab} search={search} setSearch={setSearch} />}
        {tab === 'learn' && <LearnView selectedUnit={selectedUnit} progress={progress} onPractice={handlePractice} onMistake={handleMistake} onComplete={handleComplete} />}
        {tab === 'review' && <ReviewView progress={progress} onPractice={handlePractice} onClearMistakes={handleClearMistakes} />}
        {tab === 'games' && <GamesView onPractice={handlePractice} onMistake={handleMistake} />}
        {tab === 'read' && <ReadView onPractice={handlePractice} />}
        {tab === 'progress' && <ProgressView progress={progress} user={user} onClearMistakes={handleClearMistakes} />}
      </main>
    </div>
  );
}
