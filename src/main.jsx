import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, ensureAnonymousUser } from './firebase';
import { buildPairs, categories, people } from './data';
import './styles.css';

const VOTES_PER_CATEGORY = 15;

function App() {
  const [screen, setScreen] = useState('home');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [pairIndex, setPairIndex] = useState(0);
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);

  const currentCategory = categories[categoryIndex];
  const pairs = useMemo(
    () => currentCategory ? buildPairs(currentCategory.id, VOTES_PER_CATEGORY) : [],
    [currentCategory]
  );
  const currentPair = pairs[pairIndex];

  useEffect(() => {
    ensureAnonymousUser()
      .then(() => setReady(true))
      .catch(() => setError('Firebase bağlantısı kurulamadı. Ayarları kontrol et.'));
  }, []);

  async function vote(winner, loser) {
    if (!auth.currentUser || !currentPair || saving) return;
    setSaving(true);
    setError('');
    try {
      const id = `${auth.currentUser.uid}_${currentPair.id}`;
      await setDoc(doc(db, 'votes', id), {
        voterId: auth.currentUser.uid,
        categoryId: currentCategory.id,
        pairId: currentPair.id,
        winner,
        loser,
        createdAt: serverTimestamp()
      });

      if (pairIndex + 1 < pairs.length) {
        setPairIndex(pairIndex + 1);
      } else if (categoryIndex + 1 < categories.length) {
        setCategoryIndex(categoryIndex + 1);
        setPairIndex(0);
      } else {
        await loadResults();
        setScreen('results');
      }
    } catch (e) {
      if (e?.code === 'permission-denied') {
        setError('Bu eşleşmeye daha önce oy vermiş olabilirsin.');
      } else {
        setError('Oy kaydedilemedi. İnternet bağlantını kontrol et.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function loadResults() {
    setError('');
    const snapshot = await getDocs(collection(db, 'votes'));
    const votes = snapshot.docs.map(d => d.data());
    const grouped = {};

    for (const category of categories) {
      const stats = Object.fromEntries(people.map(name => [name, { wins: 0, appearances: 0 }]));
      votes.filter(v => v.categoryId === category.id).forEach(v => {
        if (stats[v.winner]) {
          stats[v.winner].wins += 1;
          stats[v.winner].appearances += 1;
        }
        if (stats[v.loser]) stats[v.loser].appearances += 1;
      });

      grouped[category.id] = Object.entries(stats)
        .map(([name, s]) => ({
          name,
          wins: s.wins,
          appearances: s.appearances,
          percentage: s.appearances ? Math.round((s.wins / s.appearances) * 100) : 0
        }))
        .sort((a, b) => b.percentage - a.percentage || b.wins - a.wins || a.name.localeCompare(b.name, 'tr'));
    }
    setResults(grouped);
  }

  if (!ready) return <Shell><p>Hazırlanıyor…</p>{error && <ErrorBox text={error} />}</Shell>;

  if (screen === 'home') {
    return (
      <Shell>
        <div className="hero">
          <div className="crown">🏆</div>
          <h1>Acilin Enleri</h1>
          <p>21 kişi · 9 kategori · anonim ikili oylama</p>
          <button onClick={() => setScreen('vote')}>Oylamaya Başla</button>
          <button className="secondary" onClick={async () => { await loadResults(); setScreen('results'); }}>
            Sonuçları Gör
          </button>
          <small>Her kategoride {VOTES_PER_CATEGORY} karşılaştırma gösterilir.</small>
        </div>
      </Shell>
    );
  }

  if (screen === 'vote') {
    const total = categories.length * VOTES_PER_CATEGORY;
    const done = categoryIndex * VOTES_PER_CATEGORY + pairIndex;
    return (
      <Shell>
        <div className="topline">
          <span>{currentCategory.emoji} {currentCategory.label}</span>
          <span>{done + 1}/{total}</span>
        </div>
        <div className="progress"><div style={{ width: `${(done / total) * 100}%` }} /></div>
        <h2>Sence hangisi?</h2>
        <div className="choices">
          <button className="choice" disabled={saving} onClick={() => vote(currentPair.a, currentPair.b)}>
            <span className="avatar">{currentPair.a.charAt(0)}</span>
            <strong>{currentPair.a}</strong>
          </button>
          <div className="versus">VS</div>
          <button className="choice" disabled={saving} onClick={() => vote(currentPair.b, currentPair.a)}>
            <span className="avatar">{currentPair.b.charAt(0)}</span>
            <strong>{currentPair.b}</strong>
          </button>
        </div>
        {error && <ErrorBox text={error} />}
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="resultsHeader">
        <h1>Sonuçlar</h1>
        <button className="secondary" onClick={loadResults}>Yenile</button>
      </div>
      {!results ? <p>Sonuçlar yükleniyor…</p> : categories.map(category => (
        <section className="resultCard" key={category.id}>
          <h2>{category.emoji} {category.label}</h2>
          {results[category.id].slice(0, 10).map((row, index) => (
            <div className="resultRow" key={row.name}>
              <span className="rank">{index + 1}</span>
              <span className="name">{row.name}</span>
              <div className="bar"><div style={{ width: `${row.percentage}%` }} /></div>
              <strong>%{row.percentage}</strong>
            </div>
          ))}
        </section>
      ))}
      {error && <ErrorBox text={error} />}
    </Shell>
  );
}

function Shell({ children }) {
  return <main className="shell">{children}</main>;
}

function ErrorBox({ text }) {
  return <div className="error">{text}</div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
