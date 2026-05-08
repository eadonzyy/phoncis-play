export const phonicsUnits = [
  {
    id: 'alphabet', level: 1, icon: '🔤', title: 'Alphabet Sounds', zh: '字母與字母音', theme: 'pink',
    description: '認識 A-Z 的字母名稱、字母音與代表單字。',
    patterns: ['a /æ/', 'b /b/', 'c /k/', 'd /d/', 'e /e/', 'f /f/', 'g /g/', 'h /h/', 'i /ɪ/', 'j /dʒ/', 'k /k/', 'l /l/', 'm /m/', 'n /n/', 'o /ɒ/', 'p /p/', 'q /kw/', 'r /r/', 's /s/', 't /t/', 'u /ʌ/', 'v /v/', 'w /w/', 'x /ks/', 'y /j/', 'z /z/'],
    words: ['apple', 'bear', 'cat', 'dog', 'egg', 'fish', 'goat', 'hat', 'igloo', 'jam', 'kite', 'lion', 'moon', 'nest', 'octopus', 'pig', 'queen', 'rabbit', 'sun', 'tiger', 'umbrella', 'van', 'web', 'fox', 'yak', 'zebra']
  },
  {
    id: 'short-vowels', level: 2, icon: '🍎', title: 'Short Vowels', zh: '短母音', theme: 'orange',
    description: '練習 short a, e, i, o, u，為 CVC 拼讀打基礎。',
    patterns: ['short a: cat', 'short e: bed', 'short i: pig', 'short o: dog', 'short u: sun'],
    words: ['cat', 'map', 'bag', 'bed', 'pen', 'red', 'pig', 'sit', 'fish', 'dog', 'pot', 'fox', 'sun', 'cup', 'bug']
  },
  {
    id: 'cvc', level: 3, icon: '🧱', title: 'CVC Blending', zh: 'CVC 拼讀', theme: 'yellow',
    description: '把子音、母音、子音合在一起讀出完整單字。',
    patterns: ['c-a-t → cat', 'm-a-p → map', 'p-i-g → pig', 'h-o-t → hot', 'b-u-s → bus'],
    words: ['cat', 'map', 'bag', 'bed', 'pen', 'pig', 'sit', 'hot', 'dog', 'bus']
  },
  {
    id: 'word-families', level: 4, icon: '🚂', title: 'Word Families', zh: '單字家族', theme: 'green',
    description: '用押韻單字家族加強拼讀速度與閱讀流暢度。',
    patterns: ['-at', '-an', '-ig', '-op', '-ug', '-en', '-it'],
    words: ['cat', 'hat', 'mat', 'sat', 'fan', 'man', 'pan', 'pig', 'wig', 'big', 'hop', 'mop', 'bug', 'hug']
  },
  {
    id: 'blends', level: 5, icon: '🛼', title: 'Consonant Blends', zh: '子音混合音', theme: 'cyan',
    description: '兩個或三個子音連在一起，每個音都還聽得到。',
    patterns: ['bl', 'cl', 'fl', 'gl', 'pl', 'br', 'cr', 'dr', 'fr', 'gr', 'tr', 'st', 'sp', 'sk', 'sn', 'sw'],
    words: ['blue', 'clap', 'flag', 'glass', 'plane', 'brush', 'crab', 'drum', 'frog', 'green', 'train', 'star', 'spoon', 'sky', 'snake', 'swing']
  },
  {
    id: 'digraphs', level: 6, icon: '🐳', title: 'Consonant Digraphs', zh: '子音二合字母', theme: 'blue',
    description: '兩個字母合在一起，發出一個新聲音。',
    patterns: ['sh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'qu'],
    words: ['ship', 'fish', 'chair', 'cheese', 'thin', 'this', 'whale', 'phone', 'duck', 'sock', 'ring', 'sing', 'queen']
  },
  {
    id: 'magic-e', level: 7, icon: '🪄', title: 'Silent E / Magic E', zh: '魔法 E', theme: 'purple',
    description: '字尾 silent e 讓前面的母音常常讀長音。',
    patterns: ['cap → cape', 'tap → tape', 'pin → pine', 'hop → hope', 'cut → cute'],
    words: ['cape', 'tape', 'bike', 'pine', 'hope', 'rope', 'cube', 'cute']
  },
  {
    id: 'long-vowels', level: 8, icon: '🌈', title: 'Long Vowels', zh: '長母音', theme: 'pink',
    description: '長母音通常讀出字母名稱。',
    patterns: ['long a', 'long e', 'long i', 'long o', 'long u'],
    words: ['cake', 'rain', 'play', 'tree', 'bee', 'leaf', 'bike', 'pie', 'light', 'rope', 'boat', 'snow', 'cube', 'blue']
  },
  {
    id: 'vowel-teams', level: 9, icon: '👯', title: 'Vowel Teams', zh: '母音組合', theme: 'red',
    description: '兩個母音字母一起合作，發出一個主要母音。',
    patterns: ['ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'ie', 'igh', 'ue', 'ew', 'oo', 'ou', 'oi', 'oy', 'au', 'aw'],
    words: ['rain', 'train', 'day', 'play', 'bee', 'tree', 'leaf', 'beach', 'boat', 'coat', 'snow', 'yellow', 'pie', 'tie', 'light', 'night', 'blue', 'glue', 'moon', 'book', 'cloud', 'house', 'coin', 'boy', 'saw']
  },
  {
    id: 'r-controlled', level: 10, icon: '🦁', title: 'R-Controlled Vowels', zh: 'Bossy R', theme: 'stone',
    description: '母音遇到 r，聲音會被 r 改變。',
    patterns: ['ar', 'er', 'ir', 'or', 'ur'],
    words: ['car', 'star', 'her', 'fern', 'bird', 'girl', 'corn', 'fork', 'turtle', 'nurse']
  },
  {
    id: 'diphthongs', level: 11, icon: '🌊', title: 'Diphthongs', zh: '雙母音', theme: 'teal',
    description: '嘴型從一個母音滑到另一個母音。',
    patterns: ['oi', 'oy', 'ou', 'ow', 'au', 'aw'],
    words: ['coin', 'soil', 'boy', 'toy', 'cloud', 'house', 'cow', 'brown', 'sauce', 'August', 'saw', 'draw']
  },
  {
    id: 'endings-syllables', level: 12, icon: '📚', title: 'Endings & Syllables', zh: '字尾與音節', theme: 'slate',
    description: '學習常見字尾、音節類型與多音節單字。',
    patterns: ['-s', '-es', '-ed', '-ing', 'closed', 'open', 'vowel-consonant-e', 'vowel team', 'r-controlled', 'consonant-le'],
    words: ['cats', 'boxes', 'jumped', 'playing', 'rabbit', 'robot', 'table', 'tiger', 'sunset']
  }
];

export const stories = [
  {
    title: 'A Cat on a Mat',
    level: 'Short a / CVC',
    text: 'A cat sat on a mat. The cat had a hat. The hat was red.',
    focus: ['cat', 'sat', 'mat', 'hat']
  },
  {
    title: 'The Big Ship',
    level: 'Digraph sh / short i',
    text: 'I see a big ship. The ship is in the mist. The fish swim by the ship.',
    focus: ['ship', 'fish', 'mist', 'swim']
  },
  {
    title: 'Magic Cape',
    level: 'Silent e',
    text: 'Jake has a cape. He can ride a bike. He waves by the lake.',
    focus: ['Jake', 'cape', 'bike', 'lake']
  }
];

export const games = [
  { title: 'Sound Monster', zh: '餵怪獸正確音', icon: '👾', skill: '聽音選字母' },
  { title: 'Word Train', zh: '單字火車', icon: '🚂', skill: 'Word families' },
  { title: 'Magic E Lab', zh: '魔法 E 實驗室', icon: '🧪', skill: '短音變長音' },
  { title: 'Bingo', zh: 'Phonics Bingo', icon: '🎯', skill: '聽力辨識' },
  { title: 'Fishing Words', zh: '釣單字', icon: '🎣', skill: '看圖選字' },
  { title: 'Bossy R Battle', zh: 'Bossy R 對戰', icon: '🦁', skill: 'R-controlled' }
];
