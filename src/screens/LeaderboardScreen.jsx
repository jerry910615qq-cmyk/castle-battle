import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';

// 排序：① 勝場數 → ② 加權積分 → ③ 勝率
function sortRows(rows) {
  return [...rows].sort((a, b) => {
    if ((b.wins ?? 0) !== (a.wins ?? 0)) return (b.wins ?? 0) - (a.wins ?? 0);
    if ((b.weightedScore ?? 0) !== (a.weightedScore ?? 0)) return (b.weightedScore ?? 0) - (a.weightedScore ?? 0);
    return winRate(b) - winRate(a);
  });
}
const winRate = (r) => (r.games ? (r.wins ?? 0) / r.games : 0);

export default function LeaderboardScreen({ user, onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const q = query(collection(firestore, 'leaderboard'), orderBy('weightedScore', 'desc'), limit(50));
      const snap = await getDocs(q);
      setRows(sortRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`);
  const top20 = rows.slice(0, 20);
  const myIndex = rows.findIndex((r) => r.id === user?.uid);
  const me = myIndex >= 0 ? rows[myIndex] : null;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 gap-5">
      <div className="w-full max-w-2xl flex items-center justify-between">
        <h1 className="medieval-title text-3xl font-bold" style={{ color: '#7a3b1d' }}>🏆 王國排行榜</h1>
        <button onClick={load} className="px-4 py-2 rounded-xl font-bold text-sm"
          style={{ background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' }}>🔄 重新整理</button>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="parchment p-4 w-full max-w-2xl">
        <p className="text-xs px-2 py-2 mb-2 rounded-lg" style={{ background: '#fbeec2', color: 'var(--ink-soft)' }}>
          排序規則：① 勝場數 → ② 加權積分 → ③ 勝率（加權積分 = 答對題數 × 難度倍率，簡 1／中 2／難 3）
        </p>
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold border-b" style={{ color: 'var(--ink-soft)', borderColor: '#d8c290' }}>
          <div className="w-8 text-center">#</div>
          <div className="flex-1">騎士</div>
          <div className="w-12 text-right">勝場</div>
          <div className="w-16 text-right">加權分</div>
          <div className="w-14 text-right">答對</div>
          <div className="w-12 text-right">場數</div>
          <div className="w-14 text-right">勝率</div>
        </div>

        {loading && <div className="py-8 text-center" style={{ color: 'var(--ink-soft)' }}>載入中…</div>}
        {error && <div className="py-8 text-center text-sm" style={{ color: '#b3261e' }}>無法載入：{error}</div>}
        {!loading && !error && top20.length === 0 && (
          <div className="py-8 text-center" style={{ color: 'var(--ink-soft)' }}>尚無紀錄，快來成為傳奇騎士！</div>
        )}

        {top20.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: r.id === user?.uid ? '#cfe6c0' : i < 3 ? '#fbeec2' : i % 2 === 0 ? '#fffdf5' : 'transparent' }}>
            <div className="w-8 text-center font-bold">{medal(i)}</div>
            <div className="flex-1 font-bold truncate" style={{ color: 'var(--ink)' }}>{r.nickname || '匿名騎士'}</div>
            <div className="w-12 text-right font-mono" style={{ color: '#5a8f3c' }}>{r.wins ?? 0}</div>
            <div className="w-16 text-right font-mono font-bold" style={{ color: '#b8860b' }}>{r.weightedScore ?? 0}</div>
            <div className="w-14 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>{r.totalCorrect ?? 0}</div>
            <div className="w-12 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>{r.games ?? 0}</div>
            <div className="w-14 text-right font-mono" style={{ color: 'var(--ink-soft)' }}>{(winRate(r) * 100).toFixed(0)}%</div>
          </motion.div>
        ))}
      </motion.div>

      {/* 我的戰績 */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="parchment p-4 w-full max-w-2xl">
        <h2 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>我的戰績</h2>
        <div className="grid grid-cols-4 gap-3">
          <Stat label="勝場" value={me?.wins ?? 0} />
          <Stat label="加權積分" value={me?.weightedScore ?? 0} />
          <Stat label="場數" value={me?.games ?? 0} />
          <Stat label="排名" value={myIndex >= 0 ? `#${myIndex + 1}` : '—'} />
        </div>
      </motion.div>

      <button onClick={onBack} className="px-8 py-3 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95"
        style={{ background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' }}>
        ← 返回大廳
      </button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: '#fffdf5', border: '2px solid #d8c290' }}>
      <div className="text-2xl font-bold" style={{ color: '#7a3b1d' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{label}</div>
    </div>
  );
}
