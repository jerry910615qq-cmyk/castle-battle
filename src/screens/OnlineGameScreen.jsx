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

  const [charges, setCharges] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [hit, setHit] = useState(null);
  const prevScore = useRef({ blue: 0, red: 0 });

  useEffect(() => {
    const unsub = subscribeRoom(roomId, (data) => { setRoom(data); roomRef.current = data; });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    if (!room) return;
    const bs = room.blue?.score ?? 0;
    const rs = room.red?.score ?? 0;
    if (bs > prevScore.current.blue) addCharge('blue');
    if (rs > prevScore.current.red) addCharge('red');
    prevScore.current = { blue: bs, red: rs };
  }, [room?.blue?.score, room?.red?.score]);

  const addCharge = (chargeSide) => {
    const id = Date.now() + Math.random();
    const defender = chargeSide === 'blue' ? 'red' : 'blue';
    setCharges((c) => [...c, { id, side: chargeSide }]);
    setTimeout(() => {
      setCharges((c) => c.filter((x) => x.id !== id));
      const iid = Date.now() + Math.random();
      setImpacts((im) => [...im, { id: iid, side: defender }]);
      setTimeout(() => setImpacts((im) => im.filter((x) => x.id !== iid)), 600);
      setHit(defender);
      setTimeout(() => setHit((h) => (h === defender ? null : h)), 450);
    }, 1000);
  };

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
  const myTurn = (myData?.turnIndex ?? 0) === slot;
  const myQuestion = myData?.currentQuestion;
  const qKey = myQuestion ? `${myQuestion.question}@${myData?.turnIndex}` : '';

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
          if (myTurn) submitWrong(roomId, mySide, slot, level, teamSize);
          return QUESTION_TIME;
        }
        return q - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [room?.gameState, myTurn, roomId, mySide, slot, level, teamSize]);

  useEffect(() => {
    if (timeLeft === 0 && mySide === 'blue' && slot === 0 && roomRef.current?.gameState !== 'finished') {
      finishByTime(roomId);
    }
  }, [timeLeft, mySide, slot, roomId]);

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
  const ropePct = 50 + ((redHp / redMax) - (blueHp / blueMax)) * 50;
  const myCombo = myData?.combo ?? 0;
  const comboLabel = myCombo >= 5 ? '🔥 x5！' : myCombo >= 3 ? '⚡ x3！' : myCombo >= 2 ? `連擊x${myCombo}` : '';
  const timerColor = timeLeft <= 10 ? '#b3261e' : timeLeft <= 30 ? '#b8860b' : 'var(--ink)';

  const turnName = (() => {
    const m = myData?.members || {};
    const cur = m[myData?.turnIndex ?? 0];
    return cur?.nickname || '隊友';
  })();

  const TeamPanel = ({ panelSide, color, hp, maxHp, question, isMe }) => (
    <div className="flex flex-col gap-2 p-3" style={{
      flex: '0 0 30%',
      background: 'linear-gradient(160deg,#fffdf5 0%,#f6ecd6 100%)',
      border: `3px solid ${color}`,
      borderRadius: 14,
      minWidth: 0,
    }}>
      {/* 隊名 + HP */}
      <div className="text-center">
        <div className="font-bold text-sm medieval-title" style={{ color }}>
          {panelSide === 'blue' ? '🔵 藍隊' : '🔴 紅隊'}{isMe ? ' (你)' : ''}
        </div>
        <div className="font-mono font-bold text-lg" style={{ color }}>
          {Math.max(0, hp)} <span className="text-xs font-normal opacity-70">/ {maxHp}</span>
        </div>
      </div>

      {/* 15 秒倒數條（僅自己） */}
      {isMe && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e7d8b3' }}>
          <div style={{
            height: '100%',
            width: `${(qLeft / QUESTION_TIME) * 100}%`,
            background: qLeft <= 5 ? '#b3261e' : '#b8860b',
            transition: 'width 0.2s',
          }} />
        </div>
      )}

      {/* 題目 */}
      <div className="text-center font-bold" style={{
        color: 'var(--ink)',
        fontSize: '1.2rem',
        opacity: isMe ? 1 : 0.5,
        minHeight: 32,
        letterSpacing: '0.05em',
      }}>
        {question ? `${question.question} = ?` : '…'}
      </div>

      {/* 答案輸入框（僅自己） */}
      {isMe && (
        <div className="text-center font-mono font-bold text-2xl py-2 rounded-xl" style={{
          background: feedback === 'correct' ? '#d8f3c4' : feedback === 'wrong' ? '#f6d2cf' : '#fffdf5',
          border: `2px solid ${feedback === 'correct' ? '#5a8f3c' : feedback === 'wrong' ? '#b3261e' : '#d8c290'}`,
          color: 'var(--ink)',
          minHeight: 50,
          transition: 'all .2s',
        }}>
          {feedback === 'correct' ? '✅' : feedback === 'wrong' ? '❌' : (input || <span className="opacity-30">_</span>)}
        </div>
      )}

      {/* 回合提示（多人模式） */}
      {isMe && teamSize > 1 && (
        <div className="text-xs text-center font-bold" style={{ color: myTurn ? '#5a8f3c' : 'var(--ink-soft)' }}>
          {myTurn ? '👉 你的回合！' : `⏳ ${turnName} 作答中`}
        </div>
      )}

      {/* 連擊 */}
      {isMe && comboLabel && (
        <div className="text-xs text-center font-bold animate-pulse" style={{ color: '#b8860b' }}>{comboLabel}</div>
      )}

      <div style={{ flex: 1 }} />

      {/* 數字鍵盤 */}
      <div style={{
        opacity: isMe && myTurn ? 1 : 0.25,
        pointerEvents: isMe && myTurn ? 'auto' : 'none',
      }}>
        <VirtualKeyboard onKey={handleKey} color={color} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--parchment)' }}>
      {/* 頂部計時器列 */}
      <div className="flex items-center justify-center gap-6 py-2 px-4" style={{
        borderBottom: '2px solid #d8c290',
        background: 'linear-gradient(90deg,#fffdf5,#f6ecd6,#fffdf5)',
      }}>
        <span className="text-sm font-bold" style={{ color: BLUE }}>藍隊 {room.blue?.score ?? 0} 題</span>
        <span className="text-4xl font-mono font-bold" style={{ color: timerColor }}>
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </span>
        <span className="text-sm font-bold" style={{ color: RED }}>紅隊 {room.red?.score ?? 0} 題</span>
      </div>

      {/* 主體三欄 */}
      <div className="flex gap-2 flex-1 p-2" style={{ minHeight: 0 }}>

        {/* 藍隊面板 */}
        <TeamPanel
          panelSide="blue"
          color={BLUE}
          hp={blueHp}
          maxHp={blueMax}
          question={mySide === 'blue' ? myQuestion : room.blue?.currentQuestion}
          isMe={mySide === 'blue'}
        />

        {/* 中央戰場 */}
        <div className="flex flex-col justify-center gap-2 relative overflow-hidden" style={{ flex: 1, minWidth: 0 }}>
          {/* 騎士衝鋒 */}
          <AnimatePresence>
            {charges.map((c) => (
              <motion.div
                key={c.id}
                initial={{ left: c.side === 'blue' ? '5%' : '95%', opacity: 0 }}
                animate={{ left: c.side === 'blue' ? '85%' : '15%', opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeIn' }}
                className="absolute z-20 pointer-events-none"
                style={{ top: '18%', fontSize: '3.5rem', lineHeight: 1, transform: c.side === 'red' ? 'scaleX(-1)' : 'none', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.3))' }}
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
                style={{ top: '16%', left: im.side === 'blue' ? '5%' : '70%', fontSize: '2.8rem' }}
              >
                💥
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 城堡 */}
          <div className="flex items-end justify-between w-full">
            <motion.div
              animate={(hit === 'blue' || (mySide === 'blue' && shake)) ? { x: [-7, 7, -5, 4, 0], rotate: [0, -2, 2, 0] } : {}}
              transition={{ duration: 0.45 }}
            >
              <CastleSVG color={BLUE} flip={false} hp={blueHp} maxHp={blueMax} size={100} shake={hit === 'blue'} />
            </motion.div>
            <motion.div
              animate={(hit === 'red' || (mySide === 'red' && shake)) ? { x: [7, -7, 5, -4, 0], rotate: [0, 2, -2, 0] } : {}}
              transition={{ duration: 0.45 }}
            >
              <CastleSVG color={RED} flip hp={redHp} maxHp={redMax} size={100} shake={hit === 'red'} />
            </motion.div>
          </div>

          {/* 旗幟繩 */}
          <div className="relative h-3 rounded-full" style={{ background: '#d8c290' }}>
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xl"
              animate={{ left: `${Math.min(95, Math.max(5, ropePct))}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            >🚩</motion.div>
          </div>

          {/* HP 條 */}
          <div className="flex gap-2">
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#e7d8b3' }}>
              <motion.div className="h-full" style={{ background: BLUE }} animate={{ width: `${Math.max(0, (blueHp / blueMax) * 100)}%` }} />
            </div>
            <div className="flex-1 h-3 rounded-full overflow-hidden flex justify-end" style={{ background: '#e7d8b3' }}>
              <motion.div className="h-full" style={{ background: RED }} animate={{ width: `${Math.max(0, (redHp / redMax) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* 紅隊面板 */}
        <TeamPanel
          panelSide="red"
          color={RED}
          hp={redHp}
          maxHp={redMax}
          question={mySide === 'red' ? myQuestion : room.red?.currentQuestion}
          isMe={mySide === 'red'}
        />
      </div>
    </div>
  );
}
