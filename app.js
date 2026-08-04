import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, getFirestore, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyA_Ag6zyRpvcYTAHSZc2i05JZyEaq1GbYQ',
  authDomain: 'acilin-enleri.firebaseapp.com',
  projectId: 'acilin-enleri',
  storageBucket: 'acilin-enleri.firebasestorage.app',
  messagingSenderId: '5489154771',
  appId: '1:5489154771:web:b4261b2914ade08d0d1226'
};

const people = [
  'Berdel', 'Burak', 'Uğur', 'Enis', 'Güneş', 'Berkay the Kel', 'Vural',
  'Semih', 'Elif Göksü', 'Elif Yüksel', 'Furkan', 'Çağatay', 'Hamza', 'Tuna',
  'Berkay the Geyve', 'Beyza', 'Yusuf', 'Ali Utku', 'Yaren', 'Bilge', 'Taha'
];

const categories = [
  { id: 'freak', name: 'En Freak', emoji: '🤪' },
  { id: 'komik', name: 'En Komik', emoji: '😂' },
  { id: 'flortoz', name: 'En Flörtöz', emoji: '😏' },
  { id: 'gergin', name: 'En Gergin', emoji: '😤' },
  { id: 'rahat', name: 'En Rahat', emoji: '😎' },
  { id: 'duz', name: 'En Düz İnsan', emoji: '🧍' },
  { id: 'beyinsiz', name: 'En Beyinsiz', emoji: '🧠' },
  { id: 'guvenilir', name: 'En Güvenilir', emoji: '🤝' },
  { id: 'otistik', name: 'En Otistik', emoji: '🫠' }
];

function buildPairs() {
  const list = [...people, '__BYE__'];
  const matches = [];
  let rotating = [...list];
  for (let round = 0; round < 2; round += 1) {
    for (let i = 0; i < rotating.length / 2; i += 1) {
      const left = rotating[i];
      const right = rotating[rotating.length - 1 - i];
      if (left !== '__BYE__' && right !== '__BYE__') {
        matches.push({ id: `pair-${String(matches.length + 1).padStart(2, '0')}`, left, right });
      }
    }
    rotating = [rotating[0], rotating.at(-1), ...rotating.slice(1, -1)];
  }
  return matches;
}

const pairs = buildPairs();
const totalVotes = categories.length * pairs.length;
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const root = document.querySelector('#app');

let user = null;
let categoryIndex = 0;
let pairIndex = 0;
let saving = false;

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
})[character]);

function centered(content) {
  root.innerHTML = `<main class="centered"><section class="panel">${content}</section></main>`;
}

function showError(message) {
  const element = document.querySelector('#error');
  if (element) element.textContent = message;
}

function renderHome() {
  centered(`
    <div class="hero-icon">🏆</div>
    <p class="eyebrow">ACİLİN ENLERİ</p>
    <h1>Grubun enlerini seç</h1>
    <p class="lead">Her ekranda iki isim göreceksin. Kategoriye daha uygun olanı seç.</p>
    <div class="stats"><span>21 kişi</span><span>9 kategori</span><span>${totalVotes} seçim</span></div>
    <p id="error" class="error hidden"></p>
    <button id="start" class="primary">Oylamaya başla</button>
    <button id="results" class="secondary">Sonuçları gör</button>
    <p class="fineprint">Oylar anonimdir. Kimin kimi seçtiği gösterilmez.</p>
  `);
  document.querySelector('#start').onclick = () => { categoryIndex = 0; pairIndex = 0; renderVote(); };
  document.querySelector('#results').onclick = renderResults;
}

function renderVote() {
  const category = categories[categoryIndex];
  const pair = pairs[pairIndex];
  const completed = categoryIndex * pairs.length + pairIndex;
  const progress = Math.round((completed / totalVotes) * 100);

  root.innerHTML = `
    <main class="vote-page">
      <header class="vote-header"><button id="exit" class="text-button">← Çık</button><span>${categoryIndex + 1} / ${categories.length} kategori</span></header>
      <div class="progress"><div style="width:${progress}%"></div></div>
      <section class="question"><div class="category-emoji">${category.emoji}</div><p class="eyebrow">${escapeHtml(category.name.toUpperCase())}</p><h2>Hangisi?</h2><p>${pairIndex + 1} / ${pairs.length}</p></section>
      <section class="choices">
        ${[pair.left, pair.right].map((name) => `<button class="choice-card" data-name="${escapeHtml(name)}"><span class="avatar">${escapeHtml(name[0].toUpperCase())}</span><strong>${escapeHtml(name)}</strong><small>Seç</small></button>`).join('')}
      </section>
      <p id="error" class="error centered-error hidden"></p>
    </main>`;

  document.querySelector('#exit').onclick = renderHome;
  document.querySelectorAll('.choice-card').forEach((button) => {
    button.onclick = () => choose(button.dataset.name);
  });
}

async function choose(winner) {
  if (!user || saving) return;
  saving = true;
  document.querySelectorAll('.choice-card').forEach((button) => { button.disabled = true; button.querySelector('small').textContent = 'Kaydediliyor…'; });
  const category = categories[categoryIndex];
  const pair = pairs[pairIndex];
  const loser = winner === pair.left ? pair.right : pair.left;

  try {
    const voteId = `${user.uid}_${category.id}_${pair.id}`;
    await setDoc(doc(db, 'votes', voteId), {
      voterId: user.uid, categoryId: category.id, pairId: pair.id, winner, loser, createdAt: serverTimestamp()
    });

    if (pairIndex < pairs.length - 1) pairIndex += 1;
    else if (categoryIndex < categories.length - 1) { categoryIndex += 1; pairIndex = 0; }
    else {
      await setDoc(doc(db, 'completedBallots', user.uid), {
        voterId: user.uid, completedAt: serverTimestamp(), voteCount: totalVotes
      });
      renderDone();
      return;
    }
    renderVote();
  } catch (error) {
    console.error(error);
    renderVote();
    const message = document.querySelector('#error');
    message.classList.remove('hidden');
    message.textContent = 'Oy kaydedilemedi. İnternet bağlantını kontrol edip tekrar seç.';
  } finally { saving = false; }
}

function renderDone() {
  centered(`
    <div class="hero-icon">🎉</div><p class="eyebrow">OYLAMA TAMAMLANDI</p>
    <h1>Oyların kaydedildi</h1><p class="lead">Sonuçlar yeni oylar geldikçe güncellenir.</p>
    <button id="results" class="primary">Sonuçları göster</button>
  `);
  document.querySelector('#results').onclick = renderResults;
}

async function renderResults() {
  centered(`<div class="loader"></div><p>Sonuçlar hesaplanıyor…</p>`);
  try {
    const snapshot = await getDocs(collection(db, 'votes'));
    const aggregate = Object.fromEntries(categories.map((category) => [category.id, Object.fromEntries(people.map((person) => [person, { wins: 0, appearances: 0 }]))]));
    snapshot.forEach((document) => {
      const vote = document.data();
      const group = aggregate[vote.categoryId];
      if (!group?.[vote.winner] || !group?.[vote.loser]) return;
      group[vote.winner].wins += 1;
      group[vote.winner].appearances += 1;
      group[vote.loser].appearances += 1;
    });

    root.innerHTML = `<main class="results-page"><header class="results-header"><div><p class="eyebrow">CANLI SONUÇLAR</p><h1>Acilin Enleri</h1></div><button id="close" class="secondary compact">Kapat</button></header>${categories.map((category) => {
      const rows = people.map((name) => {
        const stat = aggregate[category.id][name];
        return { name, ...stat, percentage: stat.appearances ? Math.round(stat.wins / stat.appearances * 100) : 0 };
      }).sort((a, b) => b.percentage - a.percentage || b.wins - a.wins || a.name.localeCompare(b.name, 'tr'));
      return `<section class="result-card"><div class="result-title"><span>${category.emoji}</span><h2>${escapeHtml(category.name)}</h2></div><div class="ranking">${rows.map((item, index) => `<div class="rank-row"><span class="rank-number">${index + 1}</span><div class="rank-content"><div class="rank-label"><strong>${escapeHtml(item.name)}</strong><span>%${item.percentage}</span></div><div class="bar"><div style="width:${item.percentage}%"></div></div></div></div>`).join('')}</div></section>`;
    }).join('')}</main>`;
    document.querySelector('#close').onclick = renderDone;
  } catch (error) {
    console.error(error);
    centered(`<div class="hero-icon">⚠️</div><h1>Sonuçlar açılamadı</h1><p class="lead">Firestore kurallarını kontrol et.</p><button id="back" class="secondary">Geri dön</button>`);
    document.querySelector('#back').onclick = renderHome;
  }
}

onAuthStateChanged(auth, async (currentUser) => {
  try {
    user = currentUser || (await signInAnonymously(auth)).user;
    const completion = await getDoc(doc(db, 'completedBallots', user.uid));
    completion.exists() ? renderDone() : renderHome();
  } catch (error) {
    console.error(error);
    renderHome();
    const message = document.querySelector('#error');
    message.classList.remove('hidden');
    message.textContent = 'Firebase bağlantısı kurulamadı. Sayfayı yenileyip tekrar dene.';
  }
});
