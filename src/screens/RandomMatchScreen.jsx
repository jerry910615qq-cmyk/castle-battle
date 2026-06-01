import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { joinRandomQueue, leaveRandomQueue } from '../services/matchmaking';
import { levelLabel } from '../theme';

export default function RandomMatchScreen({ config, onMatched, onCancel }) {
  const { uid, nickname, level, time } = config;
  const [dots, setDots] = useState('');
  const cancelRef = useRef(null);

  useEffect(() => {
    let active = true;
    cancelRef.current = joinRandomQueue(
      { uid, nickname, level, time },
      (m) => { if (active) { setDots('已配對！'); setTimeout(() => onMatched({ ...m, nickname }), 700); } }
    );
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400);
    return () => { active = false; clearInterval(t); if (cancelRef.current) cancelRef.current(); leaveRandomQueue(uid); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-7xl">🎲</motion.div>
      <div className="text-center">
        <h2 className="medieval-title text-2xl font-bold" style={{ color: '#7a3b1d' }}>尋找對手中{dots}</h2>
        <p className="mt-2" style={{ color: 'var(--ink-soft)' }}>{levelLabel(level)} · {time}秒 · 隨機 1 對 1</p>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{nickname}</p>
      </div>
      <button onClick={onCancel}
        className="px-8 py-3 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95"
        style={{ background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' }}>
        取消配對
      </button>
    </div>
  );
}
