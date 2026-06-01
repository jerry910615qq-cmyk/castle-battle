import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CastleSVG from '../components/CastleSVG';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { BLUE, RED, QUESTION_TIME } from '../theme';
import {
  subscribeRoom, submitCorrect, submitWrong, finishByTime, settleMatch,
} from '../services/gameSync';

export default function OnlineGameScreen({ config, onEnd }) {
  const { roomId, side, slot, level, time, teamSize, nickname } = config;
  const mySide = side;
  const oppSide = side === 'blue' ? 'red' : 'blue';

  const [room, setRoom] = useState(null);
  const [timeLeft, setTimeLeft] = useState(time);
  const [qLeft, setQLeft] = useState(QUESTION_TIME);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [shake, setShake] = useState(false);
  const settledRef = useRef(false);
  const roomRef = useRef(null);
  const lastQRef = useRef('');

  // 騎士衝鋒動畫
  const [charges, setCharges] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [hit, setHit] = useState(null); // 受擊而震動的一方
  const prevScore = useRef({ blue: 0, red: 0 });

  useEffect(() => {
    const unsub = subscribeRoom(roomId, (data) => { setRoom(data); roomRef.current = data; });
    return unsub;
  }, [roomId]);

  // 偵測答對（分數上升）→ 派騎士衝向對方
  useEffect(() => {
    if (!room) return;
    const bs = room.blue?.score ?? 0;
    const rs = room.red?.score ?? 0;
    if (bs > prevScore.current.blue) addCharge('blue');
    if (rs > prevScore.current.red) addCharge('red');
    prevScore.current = { blue: bs, red: rs };
  }, [room?.blue?.score, room?.red?.score]);

  const addCharge = (side) => {
    const id = Date.now() + Math.random();
    const defender = side === 'blue' ? 'red' : 'blue';
    setCharges((c) => [...c, { id, side }]);
    // 騎士抵達（約 1 秒）→ 撞擊特效 + 城堡震動
    setTimeout(() => {
      setCharges((c) => c.filter((x) => x.id !== id));
      const iid = Date.now() + Math.random();
      setImpacts((im) => [...im, { id: iid, side: defender }]);
      setTimeout(() => setImpacts((im) => im.filter((x) => x.id !== iid)), 600);
      setHit(defender);
      setTimeout(() => setHit((h) => (h === defender ? null : h)), 450);
    }, 1000);
  };

  // 全場倒數（以伺服器 startAt 同步）
  useEffect(() => {
    const id = setInterval(() => {
      const r = roomRef.current;
      const startAt = r?.startAt;
      const dur = r?.durationSec ?? time;
      if (typeof startAt === 'number') {
        setTimeLeft(Math.max(0, dur - Math.floor((Date.now() - startAt) / 1000)));
      } else {
        setTimeLeft((t) => Math.max(0, t - 1));
      }
    }, 500);
    return () => clearInterval(id);
  }, [time]);

  const myData = room?.[mySide];
  const oppData = room?.[oppSide];
  const myTurn = (myData?.turnIndex ?? 0) === slot;
  const myQuestion = myData?.currentQuestion;
  const qKey = myQuestion ? `${myQuestion.question}@${myData?.turnIndex}` : '';

  // 每題 15 秒倒數，題目變更即重置
  useEffect(() => {
    if (qKey && qKey !== lastQRef.current) {
      lastQRef.current = qKey;
      setQLeft(QUESTION_TIME);
      setInput('');
    }
  }, [qKey]);

  useEffect(() => {
    if (room?.gameState !== 'playing') return;
    const id = setInterval(() => {
      setQLeft((q) => {
        if (q <= 1) {
          // 逾時：若輪到我，自動換題
          if (myTurn) submitWrong(roomId, mySide, slot, level, teamSize);
          return QUESTION_TIME;
        }
        return q - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [room?.gameState, myTurn, roomId, mySide, slot, level, teamSize]);

  // 全場時間到 → 藍隊房主寫入結算
  useEffect(() => {
    if (timeLeft === 0 && mySide === 'blue' && slot === 0 && roomRef.current?.gameState !== 'finished') {
      finishByTime(roomId);
    }
  }, [timeLeft, mySide, slot, roomId]);

  // 結束處理
  useEffect(() => {
    if (room?.gameState === 'finished' && !settledRef.current) {
      settledRef.current = true;
      const winner = room.winner;
      const run = async () => {
        if (mySide === 'blue' && slot === 0) {
          try { await settleMatch(roomId, room); } catch (e) { /* noop */ }
        }
        onEnd({
          winner, blueHp: room.blue?.hp ?? 0, redHp: room.red?.hp ?? 0,
          mySide, online: true,
          resultText: winner === 'draw' ? '平局' : winner === mySide ? '勝利' : '落敗',
        });
      };
      setTimeout(run, 600);
    }
  }, [room, mySide, slot, roomId, onEnd]);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handleKey = useCallback(async (k) => {
    if (!room || room.gameState !== 'playing' || timeLeft === 0 || !myQuestion || !myTurn) return;
    if (k === '⌫') setInput((p) => p.slice(0, -1));
    else if (k === '✓') {
      const ans = parseInt(input, 10);
      if (isNaN(ans)) return;
      if (ans === myQuestion.answer) {
        setFeedback('correct'); setInput('');
        await submitCorrect(roomId, mySide, slot, level, teamSize);
        setTimeout(() => setFeedback(null), 500);
      } else {
        setFeedback('wrong'); triggerShake(); setInput('');
        await submitWrong(roomId, mySide, slot, level, teamSize);
        setTimeout(() => setFeedback(null), 500);
      }
    } else setInput((p) => (p.length < 6 ? p + k : p));
  }, [room, timeLeft, myQuestion, myTurn, input, roomId, mySide, slot, level, teamSize, triggerShake]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key);
      else if (e.key === 'Backspace') handleKey('⌫');
      else if (e.key === 'Enter') handleKey('✓');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  if (!room) {
    return <div className="min-h-screen flex items-center justify-center text-xl" style={{ color: 'var(--ink-soft)' }}>載入戰場中…</div>;
  }

  const blueHp = room.blue?.hp ?? 100, blueMax = room.blue?.maxHp ?? 100;
  const redHp = room.red?.hp ?? 100, redMax = room.red?.maxHp ?? 100;
  const myColor = mySide === 'blue' ? BLUE : RED;
  const ropePct = 50 + ((redHp / redMax) - (blueHp / blueMax)) * 50;
  const myCombo = myData?.combo ?? 0;
  const comboLabel = myCombo >= 5 ? '🔥 連擊 x5！' : myCombo >= 3 ? '⚡ 連擊 x3！' : myCombo >= 2 ? `連擊 x${myCombo}` : '';
  const timerColor = timeLeft <= 10 ? '#b3261e' : timeLeft <= 30 ? '#b8860b' : 'var(--ink)';

  const turnName = (() => {
    const m = myData?.members || {};
    const cur = m[myData?.turnIndex ?? 0];
    return cur?.nickname || '隊友';
  })();

  const TeamHead = ({ team, color, data, max, isMe }) => (
    <div className="flex-1 text-center">
      <div className="font-bold text-sm" style={{ color }}>{team}{isMe ? ' (你)' : ''}</div>
      <div className="font-bold text-lg" style={{ color }}>{Math.max(0, data?.hp ?? max)} / {max}</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col px-3 py-3 gap-3 max-w-md mx-auto w-full">
      {/* 頂部：隊伍 + 計時 */}
      <div className="parchment px-4 py-3 flex items-center justify-between">
        <TeamHead team="藍隊" color={BLUE} data={room.blue} max={blueMax} isMe={mySide === 'blue'} />
        <div className="text-3xl font-mono font-bold px-2" style={{ color: timerColor }}>
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
        <TeamHead team="紅隊" color={RED} data={room.red} max={redMax} isMe={mySide === 'red'} />
      </div>

      {/* 中央戰場（城堡放大，佔約 2/3）*/}
      <div className="parchment p-3 flex-[2] flex flex-col justify-center relative overflow-hidden">
        {/* 騎士衝鋒 */}
        <AnimatePresence>
          {charges.map((c) => (
            <motion.div
              key={c.id}
              initial={{ left: c.side === 'blue' ? '16%' : '84%', opacity: 0 }}
              animate={{ left: c.side === 'blue' ? '80%' : '20%', opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeIn' }}
              className="absolute z-20 pointer-events-none"
              style={{ top: '20%', fontSize: '5.5rem', lineHeight: 1, transform: c.side === 'red' ? 'scaleX(-1)' : 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.3))' }}
            >
              🐎
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 撞擊特效 */}
        <AnimatePresence>
          {impacts.map((im) => (
            <motion.div
              key={im.id}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.4, 1.6, 1.2], opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute z-30 pointer-events-none"
              style={{ top: '24%', left: im.side === 'blue' ? '14%' : '74%', fontSize: '3.5rem' }}
            >
              💥
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="flex items-end justify-between">
          <motion.div animate={(hit === 'blue' || (mySide === 'blue' && shake)) ? { x: [-8, 8, -6, 5, 0], rotate: [0, -2, 2, 0] } : {}} transition={{ duration: 0.45 }}>
            <CastleSVG color={BLUE} flip={false} hp={blueHp} maxHp={blueMax} size={140} shake={hit === 'blue'} />
          </motion.div>
          <motion.div animate={(hit === 'red' || (mySide === 'red' && shake)) ? { x: [8, -8, 6, -5, 0], rotate: [0, 2, -2, 0] } : {}} transition={{ duration: 0.45 }}>
            <CastleSVG color={RED} flip hp={redHp} maxHp={redMax} size={140} shake={hit === 'red'} />
          </motion.div>
        </div>
        <div className="relative h-3 mt-2 rounded-full" style={{ background: '#d8c290' }}>
          <motion.div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xl"
            animate={{ left: `${Math.min(95, Math.max(5, ropePct))}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}>🚩</motion.div>
        </div>
        <div className="flex gap-2 mt-2">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#e7d8b3' }}>
            <motion.div className="h-full" style={{ background: BLUE }} animate={{ width: `${Math.max(0, (blueHp / blueMax) * 100)}%` }} />
          </div>
          <div className="flex-1 h-3 rounded-full overflow-hidden flex justify-end" style={{ background: '#e7d8b3' }}>
            <motion.div className="h-full" style={{ background: RED }} animate={{ width: `${Math.max(0, (redHp / redMax) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* 答題面板（佔約 1/3）*/}
      <div className="parchment p-4 flex flex-col gap-2 flex-[1]" style={{ borderColor: myColor }}>
        {/* 回合提示 */}
        <div className="text-center text-sm font-bold" style={{ color: myTurn ? '#5a8f3c' : 'var(--ink-soft)' }}>
          {teamSize > 1 ? (myTurn ? '👉 你的回合！' : `⏳ ${turnName} 作答中…`) : '你的題目'}
        </div>

        {/* 每題 15 秒進度條 */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e7d8b3' }}>
          <div className="h-full transition-all" style={{ width: `${(qLeft / QUESTION_TIME) * 100}%`, background: qLeft <= 5 ? '#b3261e' : '#b8860b' }} />
        </div>

        <div className="text-center text-3xl font-bold tracking-widest" style={{ color: 'var(--ink)', opacity: myTurn ? 1 : 0.5 }}>
          {myQuestion ? `${myQuestion.question} = ?` : '…'}
        </div>

        <div className="w-full text-center text-3xl font-mono font-bold py-3 rounded-xl"
          style={{
            background: feedback === 'correct' ? '#d8f3c4' : feedback === 'wrong' ? '#f6d2cf' : '#fffdf5',
            border: `2px solid ${feedback === 'correct' ? '#5a8f3c' : feedback === 'wrong' ? '#b3261e' : '#d8c290'}`,
            color: 'var(--ink)', minHeight: 56, transition: 'all .2s',
          }}>
          {feedback === 'correct' ? '✅' : feedback === 'wrong' ? '❌' : (input || <span className="opacity-30">_</span>)}
        </div>

        {comboLabel && <div className="text-center font-bold animate-pulse" style={{ color: '#b8860b' }}>{comboLabel}</div>}

        <div style={{ opacity: myTurn ? 1 : 0.4, pointerEvents: myTurn ? 'auto' : 'none' }}>
          <VirtualKeyboard onKey={handleKey} color={myColor} />
        </div>
      </div>
    </div>
  );
}
