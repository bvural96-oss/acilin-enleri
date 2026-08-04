export const people = [
  'Berdel', 'Burak', 'Uğur', 'Enis', 'Güneş', 'Berkay the Kel', 'Vural',
  'Semih', 'Elif Göksu', 'Elif Yüksel', 'Furkan', 'Çağatay', 'Hamza', 'Tuna',
  'Berkay the Geyve', 'Beyza', 'Yusuf', 'Ali Utku', 'Yaren', 'Bilge', 'Taha'
];

export const categories = [
  { id: 'freak', label: 'En Freak', emoji: '🤪' },
  { id: 'komik', label: 'En Komik', emoji: '😂' },
  { id: 'flortoz', label: 'En Flörtöz', emoji: '😏' },
  { id: 'gergin', label: 'En Gergin', emoji: '😤' },
  { id: 'rahat', label: 'En Rahat', emoji: '😎' },
  { id: 'duz', label: 'En Düz İnsan', emoji: '🧍' },
  { id: 'beyinsiz', label: 'En Beyinsiz', emoji: '🫠' },
  { id: 'guvenilir', label: 'En Güvenilir', emoji: '🤝' },
  { id: 'otistik', label: 'En Otistik', emoji: '🧩' }
];

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => (value = value * 16807 % 2147483647) / 2147483647;
}

function hash(text) {
  return [...text].reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
}

export function buildPairs(categoryId, count = 15) {
  const random = seededRandom(Math.abs(hash(categoryId)) + 1);
  const shuffled = [...people].sort(() => random() - 0.5);
  const pairs = [];

  // Önce herkesin en az bir kez görünmesini sağla.
  for (let i = 0; i < shuffled.length - 1 && pairs.length < count; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  if (shuffled.length % 2 === 1 && pairs.length < count) {
    pairs.push([shuffled.at(-1), shuffled[0]]);
  }

  const allPairs = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) allPairs.push([people[i], people[j]]);
  }
  allPairs.sort(() => random() - 0.5);

  for (const pair of allPairs) {
    if (pairs.length >= count) break;
    if (!pairs.some(([a, b]) => (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]))) {
      pairs.push(pair);
    }
  }

  return pairs.map(([a, b], index) => ({ id: `${categoryId}-${index + 1}`, a, b }));
}
