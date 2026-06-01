import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ensureAuth } from '../firebase';
import { joinQueue, leaveQueue } from '../services/matchmaking';
import { ensureUserDoc } from '../services/gameSync';

export default function MatchmakingScreen({ config, onMatched, onCancel }) {
  const { level, time, nickname } = config;
  const [status, setStatus] = useState('連線中…');
  const [dots, setDots] = useState('');
  const cancelRef = useRef(null);
  const uidRef = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const user = await ensureAuth();
        if (!active) return;
        uidRef.current = user.uid;
        await ensureUserDoc(user.uid, nickname);
        setStatus('尋找對手中');

        cancelRef.current = joinQueue(
          { uid: user.uid, nickname, mode: 'online', difficulty: level },
          ({ roomId, side }) => {
            if (!active) return;
            setStatus('已配對！準備開戰');
            setTimeout(() => onMatched({ roomId, side, level, time, nickname, uid: uidRef.current }), 800);
          }
        );
      } catch (e) {
        if (active) setStatus('連線失敗：' + e.message);
      }
    })();

    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);

    return () => {
      active = false;
      clearInterval(dotTimer);
      if (cancelRef.current) cancelRef.current();
      if (uidRef.current) leaveQueue(uidRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <motion.div
        animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-7xl"
      >
        ⚔️
      </motion.div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-yellow-300">{status}{status === '尋找對手中' ? dots : ''}</h2>
        <p className="text-blue-200 mt-2">難度：第{level}階段 · 時間：{time}秒</p>
        <p className="text-white/50 text-sm mt-1">暱稱：{nickname}</p>
      </div>

      <button
        onClick={onCancel}
        className="px-8 py-3 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl transition-all hover:scale-105 active:scale-95"
      >
        取消配對
      </button>
    </div>
  );
}
