
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_Ag6zyRpycYTAHSZc2j05JZyEaq1GbVQ",
  authDomain: "acilin-enleri.firebaseapp.com",
  projectId: "acilin-enleri",
  storageBucket: "acilin-enleri.firebasestorage.app",
  messagingSenderId: "5489154771",
  appId: "1:5489154771:web:b4261b2914ade08d0d1226"
};

const PEOPLE = [{"id": "berdel", "name": "Berdel", "photo": "./photos/berdel.jpg"}, {"id": "burak", "name": "Burak", "photo": "./photos/burak.jpg"}, {"id": "ugur", "name": "Uğur", "photo": "./photos/ugur.jpg"}, {"id": "enis", "name": "Enis", "photo": "./photos/enis.jpg"}, {"id": "gunes", "name": "Güneş", "photo": "./photos/gunes.jpg"}, {"id": "berkay-the-kel", "name": "Berkay the Kel", "photo": "./photos/berkay-the-kel.jpg"}, {"id": "vural", "name": "Vural", "photo": "./photos/vural.jpg"}, {"id": "semih", "name": "Semih", "photo": "./photos/semih.jpg"}, {"id": "elif-goksu", "name": "Elif Göksu", "photo": "./photos/elif-goksu.jpg"}, {"id": "elif-yuksel", "name": "Elif Yüksel", "photo": "./photos/elif-yuksel.jpg"}, {"id": "furkan", "name": "Furkan", "photo": "./photos/furkan.jpg"}, {"id": "cagatay", "name": "Çağatay", "photo": "./photos/cagatay.jpg"}, {"id": "hamza", "name": "Hamza", "photo": "./photos/hamza.jpg"}, {"id": "tuna", "name": "Tuna", "photo": "./photos/tuna.jpg"}, {"id": "berkay-the-geyve", "name": "Berkay the Geyve", "photo": "./photos/berkay-the-geyve.jpg"}, {"id": "beyza", "name": "Beyza", "photo": "./photos/beyza.jpg"}, {"id": "yusuf", "name": "Yusuf", "photo": "./photos/yusuf.jpg"}, {"id": "ali-utku", "name": "Ali Utku", "photo": "./photos/ali-utku.jpg"}, {"id": "yaren", "name": "Yaren", "photo": ""}, {"id": "bilge", "name": "Bilge", "photo": ""}, {"id": "taha", "name": "Taha", "photo": "./photos/taha.jpg"}];
const CATEGORIES = [{"id": "en-freak", "name": "En Freak", "emoji": "🤪"}, {"id": "en-komik", "name": "En Komik", "emoji": "😂"}, {"id": "en-flortoz", "name": "En Flörtöz", "emoji": "😏"}, {"id": "en-gergin", "name": "En Gergin", "emoji": "😤"}, {"id": "en-rahat", "name": "En Rahat", "emoji": "😎"}, {"id": "en-duz-insan", "name": "En Düz İnsan", "emoji": "🧍"}, {"id": "en-beyinsiz", "name": "En Beyinsiz", "emoji": "🧠"}, {"id": "en-guvenilir", "name": "En Güvenilir", "emoji": "🤝"}, {"id": "en-otistik", "name": "En Otistik", "emoji": "🫠"}, {"id": "en-pic", "name": "En Piç", "emoji": "😈"}];
const appNode = document.querySelector("#app");

let auth, db, user;
let categoryIndex = 0;
let tournament = null;
let busy = false;

function initials(name) {
  return name.split(/\s+/).map(x => x[0]).join("").slice(0,2).toLocaleUpperCase("tr-TR");
}

function media(person, avatar=false) {
  if (!person.photo) return `<span class="fallback" style="display:grid">${initials(person.name)}</span>`;
  return `<img ${avatar ? 'class="rank-avatar"' : ''} src="${person.photo}" alt="${person.name}"
    onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
    <span class="fallback" style="display:none">${initials(person.name)}</span>`;
}

function personById(id) {
  return PEOPLE.find(p => p.id === id);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function userSpecificOrder(categoryId) {
  const ids = PEOPLE.map(p => p.id);
  let seed = hashString(`${user.uid}:${categoryId}:acilin-enleri-v1`);

  const rand = () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

function makeTournament(categoryId) {
  const order = userSpecificOrder(categoryId);
  const slots = Array(32).fill(null);
  // Standard 32-slot seeding positions, populated from the pre-shuffled order.
  const positions = [0,16,8,24,4,20,12,28,2,18,10,26,6,22,14,30,1,17,9,25,5];
  order.forEach((id, i) => slots[positions[i]] = id);

  return {
    phase: "main",
    round: 1,
    slots,
    matchIndex: 0,
    nextSlots: [],
    completedMainMatches: 0,
    matchWins: Object.fromEntries(PEOPLE.map(p => [p.id, 0])),
    eliminatedRound: {},
    championId: null,
    placementCandidates: [],
    placementStep: 0,
    placementWinners: [],
    placementLosers: [],
    secondId: null,
    thirdId: null
  };
}

function currentMatches() {
  const matches = [];
  for (let i = 0; i < tournament.slots.length; i += 2) {
    matches.push([tournament.slots[i], tournament.slots[i+1]]);
  }
  return matches;
}

function normalizeByes() {
  let matches = currentMatches();
  while (tournament.matchIndex < matches.length) {
    const [a,b] = matches[tournament.matchIndex];
    if (a && b) break;
    tournament.nextSlots.push(a || b || null);
    tournament.matchIndex++;
  }

  if (tournament.matchIndex >= matches.length) {
    tournament.slots = tournament.nextSlots;
    tournament.nextSlots = [];
    tournament.matchIndex = 0;
    tournament.round++;
    if (tournament.slots.length > 1) normalizeByes();
  }
}

function progressKey(categoryId) {
  return `ae_tournament_${categoryId}`;
}

function saveProgress() {
  localStorage.setItem(progressKey(CATEGORIES[categoryIndex].id), JSON.stringify(tournament));
}

function clearCategoryProgress(categoryId) {
  localStorage.removeItem(progressKey(categoryId));
}

function votingNav() {
  return `<div class="vote-nav">
    <button class="btn btn-secondary btn-compact" id="categoriesBtn">← Kategoriler</button>
    <button class="btn btn-secondary btn-compact" id="liveResultsBtn">📊 Sonuçlar</button>
  </div>`;
}

function bindVotingNav() {
  document.querySelector("#categoriesBtn")?.addEventListener("click", showCategoryPicker);
  document.querySelector("#liveResultsBtn")?.addEventListener("click", showResults);
}

async function loadCategory(index) {
  categoryIndex = index;
  const categoryId = CATEGORIES[index].id;
  const saved = localStorage.getItem(progressKey(categoryId));
  tournament = saved ? JSON.parse(saved) : makeTournament(categoryId);
  renderCurrent();
}

async function getMyCompletedCategoryIds() {
  const snap = await getDocs(collection(db, "podiums"));
  return new Set(
    snap.docs
      .map(d => d.data())
      .filter(v => v.voterId === user.uid)
      .map(v => v.categoryId)
  );
}

async function showCategoryPicker() {
  appNode.innerHTML = `<section class="shell"><div class="panel center">
    <div class="logo">🗳️</div><h2>Kategori seç</h2><p>İstediğin kategoriden başlayabilir, yarım bıraktığına sonra dönebilirsin.</p>
    <div class="status">Kategoriler yükleniyor...</div>
  </div></section>`;

  try {
    const completed = await getMyCompletedCategoryIds();
    appNode.innerHTML = `<section class="shell"><div class="panel">
      <div class="results-head">
        <div>
          <div class="eyebrow">Acilin Enleri</div>
          <h2>Kategori seç</h2>
          <p>Yarım kalan kategoriler bu cihazda kaldığı yerden devam eder.</p>
        </div>
        <button class="btn btn-secondary" id="pickerResultsBtn">📊 Sonuçlar</button>
      </div>
      <div class="category-grid">
        ${CATEGORIES.map((cat, index) => {
          const done = completed.has(cat.id);
          const hasProgress = !!localStorage.getItem(progressKey(cat.id));
          return `<button class="category-card ${done ? "done" : ""}" data-category="${index}" ${done ? "disabled" : ""}>
            <span class="category-emoji">${cat.emoji}</span>
            <span class="category-title">${cat.name}</span>
            <span class="category-state">${done ? "✓ Tamamlandı" : hasProgress ? "Devam et" : "Başla"}</span>
          </button>`;
        }).join("")}
      </div>
      <div class="footer-note">Tamamlanan kategoriler yeniden oylanamaz; sonuçları istediğin zaman görebilirsin.</div>
    </div></section>`;

    document.querySelector("#pickerResultsBtn").onclick = showResults;
    document.querySelectorAll("[data-category]").forEach(btn => {
      btn.onclick = () => loadCategory(Number(btn.dataset.category));
    });
  } catch (err) {
    home("Kategoriler alınamadı: " + (err?.message || ""), true);
  }
}

function card(person) {
  return `<button class="person-card" data-choice="${person.id}">
    <span class="photo-wrap">${media(person)}</span>
    <span class="person-name">${person.name}</span>
  </button>`;
}

function home(message="", error=false) {
  appNode.innerHTML = `
  <section class="shell"><div class="panel center">
    <div class="logo">🏆</div>
    <div class="eyebrow">Acilin Enleri</div>
    <h1>Kişiye özel eleme</h1>
    <p>Her kullanıcı için kategori başında farklı bir ağaç oluşturulur. Aynı kullanıcı geri geldiğinde ağacı değişmez.</p>
    <div class="meta">
      <span class="badge">${PEOPLE.length} kişi</span>
      <span class="badge">${CATEGORIES.length} kategori</span>
      <span class="badge">1., 2. ve 3. belirlenir</span>
    </div>
    ${message ? `<div class="status ${error ? "error":""}">${message}</div>` : ""}
    <div class="actions">
      <button class="btn btn-primary" id="startBtn" ${!user ? "disabled":""}>Kategori seç</button>
      <button class="btn btn-secondary" id="resultsBtn">Sonuçları gör</button>
    </div>
    <div class="footer-note">Ara seçimler toplu sonuç oyu değildir; yalnızca tur ilerletir.</div>
  </div></section>`;
  document.querySelector("#startBtn").onclick = startVoting;
  document.querySelector("#resultsBtn").onclick = showResults;
}

async function startVoting() {
  if (!user || busy) return;
  await showCategoryPicker();
}

function renderCurrent() {
  if (tournament.phase === "main") {
    normalizeByes();
    if (tournament.slots.length === 1) {
      tournament.championId = tournament.slots[0];
      preparePlacement();
      return;
    }
    renderMainMatch();
  } else {
    renderPlacementMatch();
  }
}

function roundName() {
  if (tournament.slots.length === 2) return "Final";
  if (tournament.slots.length === 4) return "Yarı final";
  if (tournament.slots.length === 8) return "Çeyrek final";
  return `${tournament.round}. tur`;
}

function renderMainMatch() {
  const matches = currentMatches();
  const [leftId,rightId] = matches[tournament.matchIndex];
  const left = personById(leftId), right = personById(rightId);
  const cat = CATEGORIES[categoryIndex];
  const pct = Math.round(tournament.completedMainMatches / (PEOPLE.length - 1) * 100);

  appNode.innerHTML = `
  <section class="shell"><div class="panel">
    ${votingNav()}
    <div class="center">
      <div class="eyebrow">Kategori ${categoryIndex+1} / ${CATEGORIES.length} · ${roundName()}</div>
      <h2>${cat.emoji} ${cat.name}</h2>
      <p>Kazanan yoluna devam eder; kaybeden ana tablodan elenir.</p>
    </div>
    <div class="progress-wrap">
      <div class="progress-label"><span>Ana eleme ${tournament.completedMainMatches+1} / ${PEOPLE.length-1}</span><span>%${pct}</span></div>
      <div class="progress"><span style="width:${pct}%"></span></div>
    </div>
    <div class="vs-grid">${card(left)}<div class="vs">VS</div>${card(right)}</div>
    <div class="footer-note">Şampiyon doğrudan 1. olur. Diğer güçlü adaylar sonra podyum turuna çıkar.</div>
  </div></section>`;

  bindVotingNav();
  document.querySelectorAll("[data-choice]").forEach(btn => {
    btn.onclick = () => chooseMainWinner(btn.dataset.choice, leftId, rightId);
  });
}

function chooseMainWinner(winnerId, leftId, rightId) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("[data-choice]").forEach(x => x.disabled = true);

  const loserId = winnerId === leftId ? rightId : leftId;
  tournament.matchWins[winnerId] = (tournament.matchWins[winnerId] || 0) + 1;
  tournament.eliminatedRound[loserId] = tournament.round;
  tournament.nextSlots.push(winnerId);
  tournament.matchIndex++;
  tournament.completedMainMatches++;

  const matches = currentMatches();
  if (tournament.matchIndex >= matches.length) {
    tournament.slots = tournament.nextSlots;
    tournament.nextSlots = [];
    tournament.matchIndex = 0;
    tournament.round++;
  }

  normalizeByes();
  saveProgress();
  busy = false;
  renderCurrent();
}

function preparePlacement() {
  // Champion is first. Rank remaining candidates by main-bracket wins,
  // then by later elimination round, then by the fixed random bracket order.
  const catId = CATEGORIES[categoryIndex].id;
  const randomOrder = userSpecificOrder(catId);
  const candidates = PEOPLE
    .filter(p => p.id !== tournament.championId)
    .sort((a,b) =>
      (tournament.matchWins[b.id] || 0) - (tournament.matchWins[a.id] || 0) ||
      (tournament.eliminatedRound[b.id] || 0) - (tournament.eliminatedRound[a.id] || 0) ||
      randomOrder.indexOf(a.id) - randomOrder.indexOf(b.id)
    )
    .slice(0,4)
    .map(p => p.id);

  tournament.phase = "placement";
  tournament.placementCandidates = candidates;
  tournament.placementStep = 0;
  tournament.placementWinners = [];
  tournament.placementLosers = [];
  saveProgress();
  renderPlacementMatch();
}

function placementPair() {
  const c = tournament.placementCandidates;
  if (tournament.placementStep === 0) return [c[0], c[3]];
  if (tournament.placementStep === 1) return [c[1], c[2]];
  if (tournament.placementStep === 2) return tournament.placementWinners; // second-place final
  return tournament.placementLosers; // third-place final
}

function placementLabel() {
  if (tournament.placementStep < 2) return "Podyum elemesi";
  if (tournament.placementStep === 2) return "2.'lik maçı";
  return "3.'lük maçı";
}

function renderPlacementMatch() {
  const [leftId,rightId] = placementPair();
  const left = personById(leftId), right = personById(rightId);
  const cat = CATEGORIES[categoryIndex];

  appNode.innerHTML = `
  <section class="shell"><div class="panel">
    ${votingNav()}
    <div class="center">
      <div class="eyebrow">${placementLabel()}</div>
      <h2>${cat.emoji} ${cat.name}</h2>
      <p>Şampiyon belli. Şimdi turnuvada en çok ilerleyen adaylar 2. ve 3. sıra için kapışıyor.</p>
    </div>
    <div class="vs-grid">${card(left)}<div class="vs">VS</div>${card(right)}</div>
    <div class="footer-note">Ana turnuva şampiyonu: ${personById(tournament.championId).name}</div>
  </div></section>`;

  bindVotingNav();
  document.querySelectorAll("[data-choice]").forEach(btn => {
    btn.onclick = () => choosePlacementWinner(btn.dataset.choice, leftId, rightId);
  });
}

function choosePlacementWinner(winnerId, leftId, rightId) {
  if (busy) return;
  busy = true;
  const loserId = winnerId === leftId ? rightId : leftId;

  if (tournament.placementStep < 2) {
    tournament.placementWinners.push(winnerId);
    tournament.placementLosers.push(loserId);
  } else if (tournament.placementStep === 2) {
    tournament.secondId = winnerId;
  } else {
    tournament.thirdId = winnerId;
  }

  tournament.placementStep++;
  saveProgress();
  busy = false;

  if (tournament.placementStep > 3) savePodium();
  else renderPlacementMatch();
}

async function savePodium() {
  if (busy) return;
  busy = true;
  const cat = CATEGORIES[categoryIndex];

  try {
    const voteId = `${user.uid}_${cat.id}`;
    await setDoc(doc(db, "podiums", voteId), {
      voterId: user.uid,
      categoryId: cat.id,
      firstPersonId: tournament.championId,
      secondPersonId: tournament.secondId,
      thirdPersonId: tournament.thirdId,
      createdAt: serverTimestamp()
    });

    clearCategoryProgress(cat.id);
    showPodium(cat);
  } catch(err) {
    home("Podyum kaydedilemedi: " + (err?.message || ""), true);
  } finally {
    busy = false;
  }
}

function showPodium(cat) {
  const first = personById(tournament.championId);
  const second = personById(tournament.secondId);
  const third = personById(tournament.thirdId);

  appNode.innerHTML = `
  <section class="shell"><div class="panel center">
    <div class="eyebrow">${cat.emoji} ${cat.name}</div>
    <h2>Podyumun hazır</h2>
    <div class="ranking" style="max-width:650px;margin:24px auto">
      ${podiumRow(first,"🥇","1.")}
      ${podiumRow(second,"🥈","2.")}
      ${podiumRow(third,"🥉","3.")}
    </div>
    <button class="btn btn-primary" id="nextCategory">Kategori listesine dön</button>
  </div></section>`;

  document.querySelector("#nextCategory").onclick = showCategoryPicker;
}

function podiumRow(person, medal, label) {
  return `<div class="rank-row" style="grid-template-columns:50px 1fr 70px">
    <div class="rank-no">${medal}</div>
    <div class="rank-person">
      <span style="position:relative;width:44px;height:44px;flex:0 0 auto;overflow:hidden;border-radius:50%;background:#27272a">${media(person,true)}</span>
      <span class="rank-name">${person.name}</span>
    </div>
    <div class="percent">${label}</div>
  </div>`;
}

async function finishAll() {
  await setDoc(doc(db, "completions", user.uid), {
    voterId: user.uid,
    completedAt: serverTimestamp()
  });
  await showResults("Bütün kategoriler tamamlandı.");
}

async function showResults(message="") {
  appNode.innerHTML = `<section class="shell"><div class="panel center"><div class="logo">📊</div><h2>Sonuçlar yükleniyor</h2></div></section>`;
  try {
    const snap = await getDocs(collection(db, "podiums"));
    renderResults(snap.docs.map(d => d.data()), 0, message);
  } catch(err) {
    home("Sonuçlar alınamadı: " + (err?.message || ""), true);
  }
}

function renderResults(votes, active, message="") {
  const cat = CATEGORIES[active];
  const cv = votes.filter(v => v.categoryId === cat.id);
  const stats = Object.fromEntries(PEOPLE.map(p => [p.id, {first:0,second:0,third:0,points:0}]));

  cv.forEach(v => {
    if (stats[v.firstPersonId]) { stats[v.firstPersonId].first++; stats[v.firstPersonId].points += 3; }
    if (stats[v.secondPersonId]) { stats[v.secondPersonId].second++; stats[v.secondPersonId].points += 2; }
    if (stats[v.thirdPersonId]) { stats[v.thirdPersonId].third++; stats[v.thirdPersonId].points += 1; }
  });

  const total = cv.length || 1;
  const ranking = PEOPLE.map(p => ({
    ...p,
    ...stats[p.id],
    firstPercent: stats[p.id].first / total * 100
  })).sort((a, b) =>
  b.points - a.points ||
  b.first - a.first ||
  b.second - a.second ||
  b.third - a.third ||
  a.name.localeCompare(b.name, "tr")
);

  appNode.innerHTML = `
  <section class="shell"><div class="panel">
    <div class="results-head">
      <div>
        <div class="eyebrow">Toplu podyum sonuçları</div>
        <h2>${cat.emoji} ${cat.name}</h2>
        <div class="small">${cv.length} tamamlanmış turnuva</div>
      </div>
      <button class="btn btn-secondary" id="homeBtn">Kategoriler</button>
    </div>
    ${message ? `<div class="status">${message}</div>`:""}
    <div class="category-tabs">
      ${CATEGORIES.map((c,i)=>`<button class="tab ${i===active?"active":""}" data-tab="${i}">${c.emoji} ${c.name}</button>`).join("")}
    </div>
    <div class="ranking">${ranking.map((p,i)=>resultRow(p,i,total)).join("")}</div>
    <div class="footer-note">Sıralama önce 1.'lik sayısına, eşitlikte toplam podyum puanına göre yapılır. Puan: 1.=3, 2.=2, 3.=1.</div>
  </div></section>`;

  document.querySelector("#homeBtn").onclick = showCategoryPicker;
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => renderResults(votes, Number(b.dataset.tab)));
}

function resultRow(p,i,total) {
  const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":String(i+1);
  return `<div class="rank-row">
    <div class="rank-no">${medal}</div>
    <div class="rank-person">
      <span style="position:relative;width:44px;height:44px;flex:0 0 auto;overflow:hidden;border-radius:50%;background:#27272a">${media(p,true)}</span>
      <span class="rank-name">${p.name} <span class="small">1.: ${p.first} · 2.: ${p.second} · 3.: ${p.third}</span></span>
    </div>
    <div class="bar"><span style="width:${Math.min(p.firstPercent,100)}%"></span></div>
    <div class="percent">%${p.firstPercent.toFixed(1)}</div>
  </div>`;
}

async function init() {
  home("Firebase bağlantısı kuruluyor...");
  try {
    const fb = initializeApp(firebaseConfig);
    auth = getAuth(fb);
    db = getFirestore(fb);
    onAuthStateChanged(auth, u => { user=u; if(u) home(); });
    await signInAnonymously(auth);
  } catch(err) {
    home("Firebase bağlantısı kurulamadı: " + (err?.message || ""), true);
  }
}
init();
