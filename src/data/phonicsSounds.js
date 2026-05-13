export const defaultPhonicsSoundCategories = [
  { id: 'short-vowels', title: 'Short Vowels Sounds', zh: '短元音', color: 'pink', order: 1 },
  { id: 'long-vowels', title: 'Long Vowels Sounds', zh: '長元音', color: 'rose', order: 2 },
  { id: 'r-controlled', title: 'R-Controlled Vowels Sounds', zh: 'R元音', color: 'coral', order: 3 },
  { id: 'diphthongs', title: 'Diphthongs Vowels Sounds', zh: '雙元音', color: 'magenta', order: 4 },
  { id: 'consonants', title: 'Consonants Sounds', zh: '單輔音', color: 'teal', order: 5 },
  { id: 'digraphs', title: 'Digraphs Sounds', zh: '複合單音', color: 'green', order: 6 },
];

export const defaultPhonicsSoundItems = [
  { id: 'sv-a', categoryId: 'short-vowels', phoneme: 'a', symbol: '/æ/', sayAs: 'short a', relatedWords: ['apple', 'ant', 'cat', 'map'], highlight: 'a', enabled: true, unitIds: ['alphabet', 'short-vowels', 'cvc'] },
  { id: 'sv-e', categoryId: 'short-vowels', phoneme: 'e', symbol: '/e/', sayAs: 'short e', relatedWords: ['egg', 'bed', 'pen', 'red'], highlight: 'e', enabled: true, unitIds: ['alphabet', 'short-vowels', 'cvc'] },
  { id: 'sv-i', categoryId: 'short-vowels', phoneme: 'i', symbol: '/ɪ/', sayAs: 'short i', relatedWords: ['igloo', 'pig', 'sit', 'fish'], highlight: 'i', enabled: true, unitIds: ['alphabet', 'short-vowels', 'cvc'] },
  { id: 'sv-o', categoryId: 'short-vowels', phoneme: 'o', symbol: '/ɒ/', sayAs: 'short o', relatedWords: ['octopus', 'dog', 'pot', 'fox'], highlight: 'o', enabled: true, unitIds: ['alphabet', 'short-vowels', 'cvc'] },
  { id: 'sv-u', categoryId: 'short-vowels', phoneme: 'u', symbol: '/ʌ/', sayAs: 'short u', relatedWords: ['umbrella', 'sun', 'cup', 'bug'], highlight: 'u', enabled: true, unitIds: ['alphabet', 'short-vowels', 'cvc'] },
  { id: 'sv-oo', categoryId: 'short-vowels', phoneme: 'oo', symbol: '/ʊ/', sayAs: 'short oo', relatedWords: ['book', 'look', 'foot', 'cook'], highlight: 'oo', enabled: true, unitIds: ['vowel-teams'] },

  { id: 'lv-ai', categoryId: 'long-vowels', phoneme: 'ai', symbol: '/eɪ/', sayAs: 'long a', relatedWords: ['rain', 'train', 'paint', 'snail'], highlight: 'ai', enabled: true, unitIds: ['long-vowels', 'vowel-teams'] },
  { id: 'lv-ee', categoryId: 'long-vowels', phoneme: 'ee', symbol: '/iː/', sayAs: 'long e', relatedWords: ['bee', 'tree', 'green', 'sheep'], highlight: 'ee', enabled: true, unitIds: ['long-vowels', 'vowel-teams'] },
  { id: 'lv-igh', categoryId: 'long-vowels', phoneme: 'igh', symbol: '/aɪ/', sayAs: 'long i', relatedWords: ['light', 'night', 'bright', 'sigh'], highlight: 'igh', enabled: true, unitIds: ['long-vowels', 'vowel-teams'] },
  { id: 'lv-oa', categoryId: 'long-vowels', phoneme: 'oa', symbol: '/oʊ/', sayAs: 'long o', relatedWords: ['boat', 'coat', 'road', 'goat'], highlight: 'oa', enabled: true, unitIds: ['long-vowels', 'vowel-teams'] },
  { id: 'lv-u', categoryId: 'long-vowels', phoneme: 'u', symbol: '/juː/', sayAs: 'long u', relatedWords: ['cube', 'cute', 'music', 'use'], highlight: 'u', enabled: true, unitIds: ['long-vowels', 'silent-e'] },
  { id: 'lv-oo', categoryId: 'long-vowels', phoneme: 'oo', symbol: '/uː/', sayAs: 'long oo', relatedWords: ['moon', 'spoon', 'food', 'blue'], highlight: 'oo', enabled: true, unitIds: ['long-vowels', 'vowel-teams'] },

  { id: 'rc-ar', categoryId: 'r-controlled', phoneme: 'ar', symbol: '/ɑr/', sayAs: 'ar', relatedWords: ['car', 'star', 'park', 'farm'], highlight: 'ar', enabled: true, unitIds: ['r-controlled'] },
  { id: 'rc-or', categoryId: 'r-controlled', phoneme: 'or', symbol: '/ɔr/', sayAs: 'or', relatedWords: ['corn', 'fork', 'storm', 'horse'], highlight: 'or', enabled: true, unitIds: ['r-controlled'] },
  { id: 'rc-ur', categoryId: 'r-controlled', phoneme: 'ur', symbol: '/ɜr/', sayAs: 'er', relatedWords: ['turtle', 'nurse', 'fur', 'turn'], highlight: 'ur', enabled: true, unitIds: ['r-controlled'] },
  { id: 'rc-air', categoryId: 'r-controlled', phoneme: 'air', symbol: '/eər/', sayAs: 'air', relatedWords: ['air', 'chair', 'fair', 'hair'], highlight: 'air', enabled: true, unitIds: ['r-controlled'] },
  { id: 'rc-ear', categoryId: 'r-controlled', phoneme: 'ear', symbol: '/ɪər/', sayAs: 'ear', relatedWords: ['ear', 'near', 'dear', 'hear'], highlight: 'ear', enabled: true, unitIds: ['r-controlled'] },

  { id: 'dp-oi', categoryId: 'diphthongs', phoneme: 'oi', symbol: '/ɔɪ/', sayAs: 'oy', relatedWords: ['coin', 'soil', 'boil', 'point'], highlight: 'oi', enabled: true, unitIds: ['diphthongs', 'vowel-teams'] },
  { id: 'dp-ow', categoryId: 'diphthongs', phoneme: 'ow', symbol: '/aʊ/', sayAs: 'ow', relatedWords: ['cow', 'brown', 'cloud', 'house'], highlight: 'ow', enabled: true, unitIds: ['diphthongs', 'vowel-teams'] },

  { id: 'c-b', categoryId: 'consonants', phoneme: 'b', symbol: '/b/', sayAs: 'buh', relatedWords: ['bear', 'bat', 'bag'], highlight: 'b', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-d', categoryId: 'consonants', phoneme: 'd', symbol: '/d/', sayAs: 'duh', relatedWords: ['dog', 'desk', 'duck'], highlight: 'd', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-f', categoryId: 'consonants', phoneme: 'f', symbol: '/f/', sayAs: 'ffff', relatedWords: ['fish', 'fan', 'fox'], highlight: 'f', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-g', categoryId: 'consonants', phoneme: 'g', symbol: '/g/', sayAs: 'guh', relatedWords: ['goat', 'gum', 'girl'], highlight: 'g', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-h', categoryId: 'consonants', phoneme: 'h', symbol: '/h/', sayAs: 'huh', relatedWords: ['hat', 'hen', 'hot'], highlight: 'h', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-j', categoryId: 'consonants', phoneme: 'j', symbol: '/dʒ/', sayAs: 'juh', relatedWords: ['jam', 'jet', 'jump'], highlight: 'j', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-k', categoryId: 'consonants', phoneme: 'k', symbol: '/k/', sayAs: 'kuh', relatedWords: ['kite', 'kid', 'king'], highlight: 'k', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-l', categoryId: 'consonants', phoneme: 'l', symbol: '/l/', sayAs: 'lll', relatedWords: ['lion', 'leaf', 'leg'], highlight: 'l', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-m', categoryId: 'consonants', phoneme: 'm', symbol: '/m/', sayAs: 'mmm', relatedWords: ['moon', 'map', 'milk'], highlight: 'm', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-n', categoryId: 'consonants', phoneme: 'n', symbol: '/n/', sayAs: 'nnn', relatedWords: ['nest', 'net', 'nose'], highlight: 'n', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-p', categoryId: 'consonants', phoneme: 'p', symbol: '/p/', sayAs: 'puh', relatedWords: ['pig', 'pen', 'pan'], highlight: 'p', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-r', categoryId: 'consonants', phoneme: 'r', symbol: '/r/', sayAs: 'ruh', relatedWords: ['rabbit', 'red', 'run'], highlight: 'r', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-s', categoryId: 'consonants', phoneme: 's', symbol: '/s/', sayAs: 'sss', relatedWords: ['sun', 'sit', 'sock'], highlight: 's', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-t', categoryId: 'consonants', phoneme: 't', symbol: '/t/', sayAs: 'tuh', relatedWords: ['tiger', 'ten', 'top'], highlight: 't', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-v', categoryId: 'consonants', phoneme: 'v', symbol: '/v/', sayAs: 'vvv', relatedWords: ['van', 'vet', 'vest'], highlight: 'v', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-w', categoryId: 'consonants', phoneme: 'w', symbol: '/w/', sayAs: 'wuh', relatedWords: ['web', 'wet', 'win'], highlight: 'w', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-y', categoryId: 'consonants', phoneme: 'y', symbol: '/j/', sayAs: 'yuh', relatedWords: ['yak', 'yes', 'yellow'], highlight: 'y', enabled: true, unitIds: ['alphabet'] },
  { id: 'c-z', categoryId: 'consonants', phoneme: 'z', symbol: '/z/', sayAs: 'zzz', relatedWords: ['zebra', 'zip', 'zoo'], highlight: 'z', enabled: true, unitIds: ['alphabet'] },

  { id: 'dg-ch', categoryId: 'digraphs', phoneme: 'ch', symbol: '/tʃ/', sayAs: 'chuh', relatedWords: ['chair', 'cheese', 'chick'], highlight: 'ch', enabled: true, unitIds: ['digraphs'] },
  { id: 'dg-sh', categoryId: 'digraphs', phoneme: 'sh', symbol: '/ʃ/', sayAs: 'shhh', relatedWords: ['ship', 'fish', 'shop'], highlight: 'sh', enabled: true, unitIds: ['digraphs'] },
  { id: 'dg-th-unvoiced', categoryId: 'digraphs', phoneme: 'th', symbol: '/θ/', sayAs: 'soft th', relatedWords: ['thin', 'three', 'bath'], highlight: 'th', enabled: true, unitIds: ['digraphs'] },
  { id: 'dg-th-voiced', categoryId: 'digraphs', phoneme: 'th', symbol: '/ð/', sayAs: 'voiced th', relatedWords: ['this', 'that', 'mother'], highlight: 'th', enabled: true, unitIds: ['digraphs'] },
  { id: 'dg-wh', categoryId: 'digraphs', phoneme: 'wh', symbol: '/w/', sayAs: 'wuh', relatedWords: ['whale', 'wheel', 'white'], highlight: 'wh', enabled: true, unitIds: ['digraphs'] },
  { id: 'dg-zh', categoryId: 'digraphs', phoneme: 'zh', symbol: '/ʒ/', sayAs: 'zh', relatedWords: ['treasure', 'measure', 'vision'], highlight: 's|zh', enabled: true, unitIds: ['digraphs'] },
  { id: 'dg-ng', categoryId: 'digraphs', phoneme: 'ng', symbol: '/ŋ/', sayAs: 'ng', relatedWords: ['ring', 'sing', 'song'], highlight: 'ng', enabled: true, unitIds: ['digraphs'] },
];

export const defaultPhonicsSounds = {
  categories: defaultPhonicsSoundCategories,
  items: defaultPhonicsSoundItems,
};
