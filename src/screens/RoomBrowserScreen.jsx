import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { subscribeOpenRooms } from '../services/matchmaking';
import { levelLabel, BLUE, RED } from '../theme';

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 1, label: '1對1' },
  { id: 2, label: '2對2' },
  { id: 3, label: '3對3' },
];

export default function RoomBrowserScreen({ onJoinCode, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => subscribeOpenRooms(setRooms), []);

  const list = rooms.filter((r) => filter === 'all' || r.teamSize === filter);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 gap-5">
      <div className="w-full max-w-md flex items-center justify-between">
        <h1 className="medieval-title text-3xl font-bold" style={{ color: '#7a3b1d' }}>🔍 尋找戰場</h1>
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{list.length} 間開放中</span>
      </div>

      {/* 篩選 */}
      <div className="flex gap-2 w-full max-w-md">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="flex-1 py-2 rounded-xl font-bold text-sm transition-all"
            style={{ background: filter === f.id ? '#7a3b1d' : '#fffdf5', border: '2px solid #d8c290', color: filter === f.id ? '#fff' : 'var(--ink)' }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md flex flex-col gap-3">
        {list.length === 0 && (
          <div className="parchment p-8 text-center" style={{ color: 'var(--ink-soft)' }}>
            目前沒有符合的房間，回大廳自己開一間吧！
          </div>
        )}
        {list.map((r) => (
          <motion.div key={r.code} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="parchment p-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-2xl font-bold tracking-widest" style={{ color: '#7a3b1d' }}>{r.code}</div>
              <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                房主 <b style={{ color: BLUE }}>{r.host}</b> · {levelLabel(r.difficulty)} · {r.time}秒
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: r.teamSize === 1 ? '#5a8f3c' : r.teamSize === 2 ? '#185FA5' : '#A32D2D' }}>
                {r.teamSize} 對 {r.teamSize}
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{r.filled}/{r.capacity} 人</div>
              <button onClick={() => onJoinCode(r.code)}
                className="px-4 py-1.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: '#c9a227' }}>加入</button>
            </div>
          </motion.div>
        ))}
      </div>

      <button onClick={onBack} className="px-8 py-3 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95"
        style={{ background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' }}>
        ← 返回大廳
      </button>
    </div>
  );
}
