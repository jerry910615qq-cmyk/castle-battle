import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BLUE, RED, levelLabel } from '../theme';
import { subscribeRoom } from '../services/gameSync';
import { setReady, startGame, leaveRoom, roomReadyToStart } from '../services/matchmaking';

export default function RoomScreen({ config, onStart, onLeave }) {
  const { code, side, slot, level, time, teamSize, nickname } = config;
  const [room, setRoom] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeRoom(code, (data) => {
      setRoom(data);
      // 房主：全員就緒 → 開戰
      if (side === 'blue' && slot === 0 && data?.gameState === 'waiting' && roomReadyToStart(data)) {
        startGame(code, { level: data.difficulty, time: data.time });
      }
      // 任一人偵測到開始 → 進場
      if (data?.gameState === 'playing' && !startedRef.current) {
        startedRef.current = true;
        onStart({ roomId: code, side, slot, level: data.difficulty, time: data.time, teamSize: data.teamSize, nickname });
      }
    });
    return unsub;
  }, [code, side, slot, nickname, onStart]);

  const handleLeave = () => { leaveRoom(code, side, slot); onLeave(); };

  const myReady = room?.[side]?.members?.[slot]?.ready;

  const TeamCol = ({ teamKey, color, name }) => {
    const team = room?.[teamKey];
    const members = team?.members || {};
    return (
      <div className="flex-1 rounded-2xl p-3 flex flex-col gap-2" style={{ background: '#fffdf5', border: `3px solid ${color}` }}>
        <div className="text-center font-bold" style={{ color }}>{name}</div>
        {Array.from({ length: teamSize }).map((_, i) => {
          const m = members[i];
          const isMe = teamKey === side && i === slot;
          return (
            <div key={i} className="flex items-center justify-between px-2 py-2 rounded-lg" style={{ background: m ? '#fbeec2' : '#efe2c4' }}>
              <span className="font-bold text-sm truncate" style={{ color: 'var(--ink)' }}>
                {m ? m.nickname + (isMe ? ' (你)' : '') : '空位…'}
              </span>
              {m && (
                <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold"
                  style={{ background: m.ready ? '#5a8f3c' : '#b08968' }}>
                  {m.ready ? '✓' : '…'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-8">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
        <p style={{ color: 'var(--ink-soft)' }}>戰場房號</p>
        <div className="medieval-title text-6xl font-bold tracking-[0.3em]" style={{ color: '#7a3b1d' }}>{code}</div>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {levelLabel(level)} · {teamSize} 對 {teamSize} · {time}秒
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="parchment p-6 w-full max-w-lg flex flex-col gap-5">
        <div className="flex gap-3 items-stretch">
          <TeamCol teamKey="blue" color={BLUE} name="藍隊 👑" />
          <div className="flex items-center text-xl font-bold" style={{ color: 'var(--ink-soft)' }}>VS</div>
          <TeamCol teamKey="red" color={RED} name="紅隊" />
        </div>

        <button onClick={() => setReady(code, side, slot, !myReady)}
          className="w-full py-4 font-bold text-lg rounded-2xl text-white shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: myReady ? '#b08968' : '#5a8f3c' }}>
          {myReady ? '取消準備' : '⚔️ 準備出戰'}
        </button>

        {room && roomReadyToStart(room) && (
          <p className="text-center font-bold animate-pulse" style={{ color: '#5a8f3c' }}>全員就緒，戰鬥開始！</p>
        )}

        <button onClick={handleLeave}
          className="w-full py-2 font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{ background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' }}>
          ← 離開房間
        </button>
      </motion.div>
    </div>
  );
}
