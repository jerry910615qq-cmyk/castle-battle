import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CastleSVG from '../components/CastleSVG';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { BLUE, RED, QUESTION_TIME } from '../theme';
import { generateQuestion, calcDamage } from '../gameLogic';

const MAX_HP = 100;

export default function LocalGameScreen({ config, onEnd }) {
  const { level, time } = config;

  // 雙方共用同一題
  const [question, setQuestion] = useState(() => generateQuestion(level));
  const [qLeft, setQLeft] = useState(QUESTION_TIME);
  const [timeLeft, setTimeLeft] = useState(time);

  // 各隊獨立狀態
  const [blueHp, setBlueHp] = useState(MAX_HP);
  const [redHp, setRedHp] = useState(MAX_HP);
  const [blueCombo, setBlueCombo] = useState(0);
  const [redCombo, setRedCombo] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);

  const [blueInput, setBlueInput] = useState('');
  const [redInput, setRedInput] = useState('');
  const [blueFeedback, setBlueFeedback] = useState(null);
  const [redFeedback, setRedFeedback] = useState(null);
  const [blueShake, setBlueShake] = useState(false);
  const [redShake, setRedShake] = useState(false);

  const [charges, setCharges] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [hit, setHit] = useState(null);

  const finishedRef = useRef(false);
  const blueHpRef = useRef(MAX_HP);
  const redHpRef = useRef(MAX_HP);
  useEffect(() => { blueHpRef.current = blueHp; }, [blueHp]);
  useEffect(() => { redHpRef.current = redHp; }, [redHp]);

  // ── 全場倒數（用 Date.now 避免 StrictMode 雙重 effect 問題）──
  const startAtRef = useRef(Date.now());
  useEffect(() => {
    startAtRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startAtRef.current) / 1000);
      setTimeLeft(Math.max(0, time - elapsed));
    }, 200);
    return () => clearInterval(id);
  }, [time]);

  // 時間到 → 結算
  useEffect(() => {
    if (timeLeft === 0 && !finishedRef.current) {
      finishedRef.current = true;
      const bh = blueHpRef.current, rh = redHpRef.current;
      const winner = bh > rh ? 'blue' : rh > bh ? 'red' : 'draw';
      setTimeout(() => onEnd({
        winner, blueHp: bh, redHp: rh, mySide: 'blue', online: false,
        resultText: winner === 'draw' ? '平局！' : winner === 'blue' ? '藍隊勝利！' : '紅隊勝利！',
      }), 400);
    }
  }, [timeLeft, onEnd]);

  // ── 每題 15 秒共用倒數 ──
  useEffect(() => {
    const id = setInterval(() => {
      setQLeft((q) => {
        if (q <= 1) {
          nextQuestion();
          return QUESTION_TIME;
        }
        return q - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [level]);

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion(level));
    setBlueInput('');
    setRedInput('');
    setQLeft(QUESTION_TIME);
  }, [level]);

  const addCharge = useCallback((attackerSide) => {
    const id = Date.now() + Math.random();
    const defender = attackerSide === 'blue' ? 'red' : 'blue';
    setCharges((c) => [...c, { id, side: attackerSide }]);
    setTimeout(() => {
      setCharges((c) => c.filter((x) => x.id !== id));
      const iid = Date.now() + Math.random();
      setImpacts((im) => [...im, { id: iid, side: defender }]);
      setTimeout(() => setImpacts((im) => im.filter((x) => x.id !== iid)), 600);
      setHit(defender);
      setTimeout(() => setHit((h) => (h === defender ? null : h)), 450);
    }, 1000);
  }, []);

  const finishIfDead = useCallback((bh, rh) => {
    if ((bh <= 0 || rh <= 0) && !finishedRef.current) {
      finishedRef.current = true;
      const winner = bh <= 0 && rh <= 0 ? 'draw' : bh <= 0 ? 'red' : 'blue';
      setTimeout(() => onEnd({
        winner, blueHp: Math.max(0, bh), redHp: Math.max(0, rh),
        mySide: 'blue', online: false,
        resultText: winner === 'draw' ? '平局！' : winner === 'blue' ? '藍隊勝利！' : '紅隊勝利！',
      }), 600);
    }
  }, [onEnd]);

  // ── 藍隊按鍵 ──
  const handleBlueKey = useCallback((k) => {
    if (finishedRef.current || timeLeft === 0) return;
    if (k === '⌫') { setBlueInput((p) => p.slice(0, -1)); return; }
    if (k !== '✓') { setBlueInput((p) => p.length < 6 ? p + k : p); return; }

    const ans = parseInt(blueInput, 10);
    if (isNaN(ans)) return;

    if (ans === question.answer) {
      // 答對
      setBlueCombo((c) => {
        const newCombo = c + 1;
        const dmg = calcDamage(newCombo);
        setRedHp((rh) => {
          const next = Math.max(0, rh - dmg);
          redHpRef.current = next;
          finishIfDead(blueHpRef.current, next);
          return next;
        });
        return newCombo;
      });
      setBlueScore((s) => s + 1);
      setBlueFeedback('correct');
      setTimeout(() => setBlueFeedback(null), 500);
      addCharge('blue');
      nextQuestion();
    } else {
      // 答錯
      setBlueCombo(0);
      setBlueFeedback('wrong');
      setBlueShake(true);
      setBlueInput('');
      setTimeout(() => { setBlueFeedback(null); setBlueShake(false); }, 500);
    }
  }, [blueInput, question, timeLeft, addCharge, nextQuestion, finishIfDead]);

  // ── 紅隊按鍵 ──
  const handleRedKey = useCallback((k) => {
    if (finishedRef.current || timeLeft === 0) return;
    if (k === '⌫') { setRedInput((p) => p.slice(0, -1)); return; }
    if (k !== '✓') { setRedInput((p) => p.length < 6 ? p + k : p); return; }

    const ans = parseInt(redInput, 10);
    if (isNaN(ans)) return;

    if (ans === question.answer) {
      setRedCombo((c) => {
        const newCombo = c + 1;
        const dmg = calcDamage(newCombo);
        setBlueHp((bh) => {
          const next = Math.max(0, bh - dmg);
          blueHpRef.current = next;
          finishIfDead(next, redHpRef.current);
          return next;
        });
        return newCombo;
      });
      setRedScore((s) => s + 1);
      setRedFeedback('correct');
      setTimeout(() => setRedFeedback(null), 500);
      addCharge('red');
      nextQuestion();
    } else {
      setRedCombo(0);
      setRedFeedback('wrong');
      setRedShake(true);
      setRedInput('');
      setTimeout(() => { setRedFeedback(null); setRedShake(false); }, 500);
    }
  }, [redInput, question, timeLeft, addCharge, nextQuestion, finishIfDead]);

  const timerColor = timeLeft <= 10 ? '#b3261e' : timeLeft <= 30 ? '#b8860b' : 'var(--ink)';
  const ropePct = 50 + ((redHp / MAX_HP) - (blueHp / MAX_HP)) * 50;
  const blueComboLabel = blueCombo >= 5 ? '🔥 x5！' : blueCombo >= 3 ? '⚡ x3！' : blueCombo >= 2 ? `連擊x${blueCombo}` : '';
  const redComboLabel = redCombo >= 5 ? '🔥 x5！' : redCombo >= 3 ? '⚡ x3！' : redCombo >= 2 ? `連擊x${redCombo}` : '';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#e8d8b0', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
    <div style={{ width: '100%', maxWidth: '1280px', height: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--parchment)', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.18)', borderRadius: 16 }}>

      {/* ── 頂部計時器列 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32,
        padding: '8px 16px', flexShrink: 0,
        borderBottom: '2px solid #d8c290',
        background: 'linear-gradient(90deg,#fffdf5,#f6ecd6,#fffdf5)',
      }}>
        <div style={{ color: BLUE, fontWeight: 'bold', fontSize: 16 }}>藍隊 {blueScore} 題</div>
        <div style={{ color: timerColor, fontWeight: 'bold', fontSize: 38, fontFamily: 'monospace', minWidth: 100, textAlign: 'center' }}>
          {timeLeft}<span style={{ fontSize: 16, marginLeft: 4 }}>秒</span>
        </div>
        <div style={{ color: RED, fontWeight: 'bold', fontSize: 16 }}>紅隊 {redScore} 題</div>
      </div>

      {/* ── 主體三欄 ── */}
      <div style={{ display: 'flex', flex: 1, gap: 8, padding: 8, minHeight: 0 }}>

        {/* 藍隊面板 */}
        <div style={{
          flex: '0 0 30%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: 12,
          background: 'linear-gradient(160deg,#fffdf5 0%,#f6ecd6 100%)',
          border: `3px solid ${BLUE}`, borderRadius: 14,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: BLUE, fontWeight: 'bold', fontSize: 14 }}>🔵 藍隊</div>
            <div style={{ color: BLUE, fontWeight: 'bold', fontSize: 20, fontFamily: 'monospace' }}>
              {Math.max(0, blueHp)} <span style={{ fontSize: 11, opacity: 0.7 }}>/ {MAX_HP}</span>
            </div>
          </div>

          {/* 15 秒倒數條 */}
          <div style={{ height: 6, borderRadius: 4, overflow: 'hidden', background: '#e7d8b3' }}>
            <div style={{ height: '100%', width: `${(qLeft / QUESTION_TIME) * 100}%`, background: qLeft <= 5 ? '#b3261e' : '#b8860b', transition: 'width 0.2s' }} />
          </div>

          {/* 共用題目 */}
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 22, color: 'var(--ink)', minHeight: 36, letterSpacing: '0.04em' }}>
            {question.question} = ?
          </div>

          {/* 答案框 */}
          <div style={{
            textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 26, padding: '8px 0',
            borderRadius: 12, minHeight: 52, transition: 'all .2s',
            background: blueFeedback === 'correct' ? '#d8f3c4' : blueFeedback === 'wrong' ? '#f6d2cf' : '#fffdf5',
            border: `2px solid ${blueFeedback === 'correct' ? '#5a8f3c' : blueFeedback === 'wrong' ? '#b3261e' : '#d8c290'}`,
            color: 'var(--ink)',
          }}>
            {blueFeedback === 'correct' ? '✅' : blueFeedback === 'wrong' ? '❌' : (blueInput || <span style={{ opacity: 0.3 }}>_</span>)}
          </div>

          {blueComboLabel && <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, color: '#b8860b' }} className="animate-pulse">{blueComboLabel}</div>}

          <div style={{ flex: 1 }} />
          <VirtualKeyboard onKey={handleBlueKey} color={BLUE} />
        </div>

        {/* 中央戰場 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

          {/* 騎士衝鋒 */}
          <AnimatePresence>
            {charges.map((c) => (
              <motion.div key={c.id}
                initial={{ left: c.side === 'blue' ? '5%' : '95%', opacity: 0 }}
                animate={{ left: c.side === 'blue' ? '85%' : '15%', opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeIn' }}
                style={{ position: 'absolute', top: '20%', fontSize: '4rem', lineHeight: 1, transform: c.side === 'red' ? 'scaleX(-1)' : 'none', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.3))', zIndex: 20, pointerEvents: 'none' }}>
                🐎
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 撞擊特效 */}
          <AnimatePresence>
            {impacts.map((im) => (
              <motion.div key={im.id}
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [0.4, 1.6, 1.2], opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{ position: 'absolute', top: '18%', left: im.side === 'blue' ? '5%' : '65%', fontSize: '3rem', zIndex: 30, pointerEvents: 'none' }}>
                💥
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 城堡 — 兩座並排，底部對齊，各佔44%寬，縮高+加寬 */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 4px', overflow: 'visible' }}>
            <motion.div style={{ width: '44%' }} animate={(hit === 'blue' || blueShake) ? { x: [-7, 7, -5, 4, 0], rotate: [0, -2, 2, 0] } : {}} transition={{ duration: 0.45 }}>
              <div style={{ transform: 'scaleX(1.2) scaleY(0.8)', transformOrigin: 'bottom center' }}>
                <CastleSVG color={BLUE} flip={false} hp={blueHp} maxHp={MAX_HP} />
              </div>
            </motion.div>
            <motion.div style={{ width: '44%' }} animate={(hit === 'red' || redShake) ? { x: [7, -7, 5, -4, 0], rotate: [0, 2, -2, 0] } : {}} transition={{ duration: 0.45 }}>
              <div style={{ transform: 'scaleX(1.2) scaleY(0.8)', transformOrigin: 'bottom center' }}>
                <CastleSVG color={RED} flip hp={redHp} maxHp={MAX_HP} />
              </div>
            </motion.div>
          </div>

          {/* 旗幟繩 */}
          <div style={{ position: 'relative', height: 14, borderRadius: 7, background: '#d8c290', flexShrink: 0, margin: '6px 0 4px' }}>
            <motion.div style={{ position: 'absolute', top: '50%', fontSize: 24, translateY: '-50%', translateX: '-50%' }}
              animate={{ left: `${Math.min(95, Math.max(5, ropePct))}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 18 }}>🚩</motion.div>
          </div>

          {/* HP 條 */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <div style={{ flex: 1, height: 14, borderRadius: 7, overflow: 'hidden', background: '#e7d8b3' }}>
              <motion.div style={{ height: '100%', background: BLUE }} animate={{ width: `${Math.max(0, (blueHp / MAX_HP) * 100)}%` }} />
            </div>
            <div style={{ flex: 1, height: 14, borderRadius: 7, overflow: 'hidden', display: 'flex', justifyContent: 'flex-end', background: '#e7d8b3' }}>
              <motion.div style={{ height: '100%', background: RED }} animate={{ width: `${Math.max(0, (redHp / MAX_HP) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* 紅隊面板 */}
        <div style={{
          flex: '0 0 30%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: 12,
          background: 'linear-gradient(160deg,#fffdf5 0%,#f6ecd6 100%)',
          border: `3px solid ${RED}`, borderRadius: 14,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: RED, fontWeight: 'bold', fontSize: 14 }}>🔴 紅隊</div>
            <div style={{ color: RED, fontWeight: 'bold', fontSize: 20, fontFamily: 'monospace' }}>
              {Math.max(0, redHp)} <span style={{ fontSize: 11, opacity: 0.7 }}>/ {MAX_HP}</span>
            </div>
          </div>

          {/* 15 秒倒數條（與藍隊同步，顯示相同進度） */}
          <div style={{ height: 6, borderRadius: 4, overflow: 'hidden', background: '#e7d8b3' }}>
            <div style={{ height: '100%', width: `${(qLeft / QUESTION_TIME) * 100}%`, background: qLeft <= 5 ? '#b3261e' : '#b8860b', transition: 'width 0.2s' }} />
          </div>

          {/* 共用題目（與藍隊相同） */}
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 22, color: 'var(--ink)', minHeight: 36, letterSpacing: '0.04em' }}>
            {question.question} = ?
          </div>

          {/* 答案框 */}
          <div style={{
            textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 26, padding: '8px 0',
            borderRadius: 12, minHeight: 52, transition: 'all .2s',
            background: redFeedback === 'correct' ? '#d8f3c4' : redFeedback === 'wrong' ? '#f6d2cf' : '#fffdf5',
            border: `2px solid ${redFeedback === 'correct' ? '#5a8f3c' : redFeedback === 'wrong' ? '#b3261e' : '#d8c290'}`,
            color: 'var(--ink)',
          }}>
            {redFeedback === 'correct' ? '✅' : redFeedback === 'wrong' ? '❌' : (redInput || <span style={{ opacity: 0.3 }}>_</span>)}
          </div>

          {redComboLabel && <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, color: '#b8860b' }} className="animate-pulse">{redComboLabel}</div>}

          <div style={{ flex: 1 }} />
          <VirtualKeyboard onKey={handleRedKey} color={RED} />
        </div>
      </div>
    </div>
    </div>
  );
}
