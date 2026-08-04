
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_Ag6zyRpycYTAHSZc2j05JZyEaq1GbVQ",
  authDomain: "acilin-enleri.firebaseapp.com",
  projectId: "acilin-enleri",
  storageBucket: "acilin-enleri.firebasestorage.app",
  messagingSenderId: "5489154771",
  appId: "1:5489154771:web:b4261b2914ade08d0d1226"
};

const PEOPLE = [{"id": "berdel", "name": "Berdel", "photo": "./photos/berdel.jpg"}, {"id": "burak", "name": "Burak", "photo": "./photos/burak.jpg"}, {"id": "ugur", "name": "Uğur", "photo": "./photos/ugur.jpg"}, {"id": "enis", "name": "Enis", "photo": "./photos/enis.jpg"}, {"id": "gunes", "name": "Güneş", "photo": "./photos/gunes.jpg"}, {"id": "berkay-the-kel", "name": "Berkay the Kel", "photo": "./photos/berkay-the-kel.jpg"}, {"id": "vural", "name": "Vural", "photo": "./photos/vural.jpg"}, {"id": "semih", "name": "Semih", "photo": "./photos/semih.jpg"}, {"id": "elif-goksu", "name": "Elif Göksu", "photo": "./photos/elif-goksu.jpg"}, {"id": "elif-yuksel", "name": "Elif Yüksel", "photo": "./photos/elif-yuksel.jpg"}, {"id": "furkan", "name": "Furkan", "photo": "./photos/furkan.jpg"}, {"id": "cagatay", "name": "Çağatay", "photo": "./photos/cagatay.jpg"}, {"id": "hamza", "name": "Hamza", "photo": "./photos/hamza.jpg"}, {"id": "tuna", "name": "Tuna", "photo": "./photos/tuna.jpg"}, {"id": "berkay-the-geyve", "name": "Berkay the Geyve", "photo": "./photos/berkay-the-geyve.jpg"}, {"id": "beyza", "name": "Beyza", "photo": "./photos/beyza.jpg"}, {"id": "yusuf", "name": "Yusuf", "photo": "./photos/yusuf.jpg"}, {"id": "ali-utku", "name": "Ali Utku", "photo": "./photos/ali-utku.jpg"}, {"id": "yaren", "name": "Yaren", "photo": "./photos/yaren.jpg"}, {"id": "bilge", "name": "Bilge", "photo": "./photos/bilge.jpg"}, {"id": "taha", "name": "Taha", "photo": "./photos/taha.jpg"}];
const CATEGORIES = [{"id": "en-freak", "name": "En Freak", "emoji": "🤪"}, {"id": "en-komik", "name": "En Komik", "emoji": "😂"}, {"id": "en-flortoz", "name": "En Flörtöz", "emoji": "😏"}, {"id": "en-gergin", "name": "En Gergin", "emoji": "😤"}, {"id": "en-rahat", "name": "En Rahat", "emoji": "😎"}, {"id": "en-duz-insan", "name": "En Düz İnsan", "emoji": "🧍"}, {"id": "en-beyinsiz", "name": "En Beyinsiz", "emoji": "🧠"}, {"id": "en-guvenilir", "name": "En Güvenilir", "emoji": "🤝"}, {"id": "en-otistik", "name": "En Otistik", "emoji": "🫠"}];
const PAIRS_PER_CATEGORY = 20;
const appNode = document.querySelector("#app");

let auth, db, user;
let categoryIndex = 0;
let pairIndex = 0;
let currentPairs = [];
let busy = false;

function initials(name) {
  return name.split(/\s+/).map(x => x[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR");
}

function seededPairs(categoryId) {
  const pool = PEOPLE.map((_, i) => i);
  let seed = [...categoryId].reduce((a, c) => a + c.charCodeAt(0), 0) + 913;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const pairs = [];
  for (let round = 0; round < 2 && pairs.length < PAIRS_PER_CATEGORY; round++) {
    for (let i = 0; i < pool.length && pairs.length < PAIRS_PER_CATEGORY; i++) {
      const a = pool[i];
      const b = pool[(i + 1 + round * 7) % pool.length];
      if (a !== b) pairs.push([a, b]);
    }
  }
  return pairs;
}

function photoMarkup(person, className = "") {
  return `
    <img class="${className}" src="${person.photo}" alt="${person.name}"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
    <span class="fallback" style="display:none">${initials(person.name)}</span>
  `;
}

function home(message = "", error = false) {
  appNode.innerHTML = `
    <section class="shell">
      <div class="panel center">
        <div class="logo">🏆</div>
        <div class="eyebrow">Acilin Enleri</div>
        <h1>Grubun enlerini seç</h1>
        <p>Her ekranda iki kişi göreceksin. Kategoriye daha uygun olanı seç.</p>
        <div class="meta">
          <span class="badge">${PEOPLE.length} kişi</span>
          <span class="badge">${CATEGORIES.length} kategori</span>
          <span class="badge">${CATEGORIES.length * PAIRS_PER_CATEGORY} seçim</span>
        </div>
        ${message ? `<div class="status ${error ? "error" : ""}">${message}</div>` : ""}
        <div class="actions">
          <button class="btn btn-primary" id="startBtn" ${!user ? "disabled" : ""}>Oylamaya başla</button>
          <button class="btn btn-secondary" id="resultsBtn">Sonuçları gör</button>
        </div>
        <div class="footer-note">Oylar anonimdir. Kimin kimi seçtiği gösterilmez.</div>
      </div>
    </section>
  `;
  document.querySelector("#startBtn").onclick = startVoting;
  document.querySelector("#resultsBtn").onclick = showResults;
}

async function startVoting() {
  if (!user || busy) return;
  busy = true;
  try {
    const completion = await getDoc(doc(db, "completions", user.uid));
    if (completion.exists()) {
      await showResults("Bu cihazdan oylama daha önce tamamlanmış.");
      return;
    }
    categoryIndex = Number(localStorage.getItem("ae_category") || 0);
    pairIndex = Number(localStorage.getItem("ae_pair") || 0);
    if (categoryIndex >= CATEGORIES.length) {
      await finishVoting();
      return;
    }
    currentPairs = seededPairs(CATEGORIES[categoryIndex].id);
    renderVote();
  } finally {
    busy = false;
  }
}

function renderVote() {
  const cat = CATEGORIES[categoryIndex];
  currentPairs = seededPairs(cat.id);
  const [leftIndex, rightIndex] = currentPairs[pairIndex];
  const left = PEOPLE[leftIndex];
  const right = PEOPLE[rightIndex];
  const done = categoryIndex * PAIRS_PER_CATEGORY + pairIndex;
  const total = CATEGORIES.length * PAIRS_PER_CATEGORY;
  const pct = Math.round((done / total) * 100);

  appNode.innerHTML = `
    <section class="shell">
      <div class="panel">
        <div class="center">
          <div class="eyebrow">Kategori ${categoryIndex + 1} / ${CATEGORIES.length}</div>
          <h2>${cat.emoji} ${cat.name}</h2>
          <p>Hangisi bu kategoriye daha uygun?</p>
        </div>
        <div class="progress-wrap">
          <div class="progress-label">
            <span>Seçim ${pairIndex + 1} / ${PAIRS_PER_CATEGORY}</span>
            <span>Genel %${pct}</span>
          </div>
          <div class="progress"><span style="width:${pct}%"></span></div>
        </div>
        <div class="vs-grid">
          ${personButton(left, leftIndex)}
          <div class="vs">VS</div>
          ${personButton(right, rightIndex)}
        </div>
        <div class="footer-note">Bir karta dokununca oyun kaydedilir ve sonraki eşleşme açılır.</div>
      </div>
    </section>
  `;
  document.querySelectorAll("[data-choice]").forEach(btn => {
    btn.onclick = () => submitVote(Number(btn.dataset.choice), leftIndex, rightIndex);
  });
}

function personButton(person, index) {
  return `
    <button class="person-card" data-choice="${index}">
      <span class="photo-wrap">
        ${photoMarkup(person)}
      </span>
      <span class="person-name">${person.name}</span>
    </button>
  `;
}

async function submitVote(winnerIndex, leftIndex, rightIndex) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("[data-choice]").forEach(x => x.disabled = true);
  try {
    const cat = CATEGORIES[categoryIndex];
    const voteId = `${user.uid}_${cat.id}_${pairIndex}`;
    await setDoc(doc(db, "votes", voteId), {
      voterId: user.uid,
      categoryId: cat.id,
      pairIndex,
      leftPersonId: PEOPLE[leftIndex].id,
      rightPersonId: PEOPLE[rightIndex].id,
      winnerPersonId: PEOPLE[winnerIndex].id,
      createdAt: serverTimestamp()
    });

    pairIndex++;
    if (pairIndex >= PAIRS_PER_CATEGORY) {
      categoryIndex++;
      pairIndex = 0;
    }
    localStorage.setItem("ae_category", String(categoryIndex));
    localStorage.setItem("ae_pair", String(pairIndex));

    if (categoryIndex >= CATEGORIES.length) {
      await finishVoting();
    } else {
      renderVote();
    }
  } catch (err) {
    console.error(err);
    alert("Oy kaydedilemedi: " + (err?.message || "Bilinmeyen hata"));
    document.querySelectorAll("[data-choice]").forEach(x => x.disabled = false);
  } finally {
    busy = false;
  }
}

async function finishVoting() {
  await setDoc(doc(db, "completions", user.uid), {
    voterId: user.uid,
    completedAt: serverTimestamp()
  });
  localStorage.removeItem("ae_category");
  localStorage.removeItem("ae_pair");
  await showResults("Oylaman tamamlandı. Teşekkürler!");
}

async function showResults(message = "") {
  appNode.innerHTML = `
    <section class="shell">
      <div class="panel center">
        <div class="logo">📊</div>
        <h2>Sonuçlar yükleniyor</h2>
        <p>Lütfen birkaç saniye bekle.</p>
      </div>
    </section>
  `;
  try {
    const snap = await getDocs(collection(db, "votes"));
    const votes = snap.docs.map(d => d.data());
    renderResults(votes, 0, message);
  } catch (err) {
    console.error(err);
    home("Sonuçlar alınamadı: " + (err?.message || "Bilinmeyen hata"), true);
  }
}

function renderResults(votes, activeCategoryIndex, message = "") {
  const cat = CATEGORIES[activeCategoryIndex];
  const catVotes = votes.filter(v => v.categoryId === cat.id);
  const wins = Object.fromEntries(PEOPLE.map(p => [p.id, 0]));
  for (const v of catVotes) {
    if (wins[v.winnerPersonId] !== undefined) wins[v.winnerPersonId]++;
  }
  const total = catVotes.length || 1;
  const ranking = PEOPLE
    .map(p => ({...p, wins: wins[p.id], percent: (wins[p.id] / total) * 100}))
    .sort((a,b) => b.wins - a.wins || a.name.localeCompare(b.name, "tr"));

  appNode.innerHTML = `
    <section class="shell">
      <div class="panel">
        <div class="results-head">
          <div>
            <div class="eyebrow">Canlı sonuçlar</div>
            <h2>${cat.emoji} ${cat.name}</h2>
            <div class="small">${catVotes.length} kayıtlı seçim</div>
          </div>
          <button class="btn btn-secondary" id="homeBtn">Ana sayfa</button>
        </div>
        ${message ? `<div class="status">${message}</div>` : ""}
        <div class="category-tabs">
          ${CATEGORIES.map((c,i) => `<button class="tab ${i === activeCategoryIndex ? "active" : ""}" data-tab="${i}">${c.emoji} ${c.name}</button>`).join("")}
        </div>
        <div class="ranking">
          ${ranking.map((p,i) => rankRow(p,i)).join("")}
        </div>
        <div class="footer-note">Yüzde, bu kategoride verilen toplam seçimlerin ne kadarını kişinin kazandığını gösterir.</div>
      </div>
    </section>
  `;
  document.querySelector("#homeBtn").onclick = () => home();
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.onclick = () => renderResults(votes, Number(btn.dataset.tab));
  });
}

function rankRow(person, index) {
  const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : String(index + 1);
  const rounded = person.percent.toFixed(1);
  return `
    <div class="rank-row">
      <div class="rank-no">${medal}</div>
      <div class="rank-person">
        <span style="position:relative;width:42px;height:42px;flex:0 0 auto">
          <img class="rank-avatar" src="${person.photo}" alt="${person.name}"
            onerror="this.style.visibility='hidden'; this.nextElementSibling.style.display='grid';">
          <span class="fallback" style="display:none;font-size:13px;border-radius:50%;background:#27272a">${initials(person.name)}</span>
        </span>
        <span class="rank-name">${person.name} <span class="small">(${person.wins})</span></span>
      </div>
      <div class="bar"><span style="width:${Math.min(person.percent,100)}%"></span></div>
      <div class="percent">%${rounded}</div>
    </div>
  `;
}

async function init() {
  home("Firebase bağlantısı kuruluyor...");
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    onAuthStateChanged(auth, u => {
      user = u;
      if (u) home();
    });

    await signInAnonymously(auth);
  } catch (err) {
    console.error(err);
    const hint = err?.code === "auth/unauthorized-domain"
      ? "Vercel alan adını Firebase Authentication → Settings → Authorized domains bölümüne ekle."
      : "";
    home(`Firebase bağlantısı kurulamadı. ${hint} ${err?.message || ""}`, true);
  }
}

init();
