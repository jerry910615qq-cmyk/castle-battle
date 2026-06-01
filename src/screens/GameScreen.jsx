import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CastleSVG from '../components/CastleSVG';
import HPBar from '../components/HPBar';
import Cannonball from '../components/Cannonball';
import VirtualKeyboard from '../components/VirtualKeyboard';
import { generateQuestion, calcDamage } from '../gameLogic';

const BLUE = '#185FA5';
const RED = '#A32D2D';

function usePlayer(level) {
  const [hp, setHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState(() => generateQuestion(level));
  const [shake, setShake] = useState(false);
  const [fire, setFire] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'

  const nextQ = useCallback(() => setQuestion(generateQuestion(level)), [level]);

  const triggerFire = useCallback(() => {
    setFire(true);
    setTimeout(() => setFire(false), 700);
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  return {
    hp, setHp, combo, setCombo,
    input, setInput,
    question, nextQ,
    shake, triggerShake,
    fire, triggerFire,
    feedback, setFeedback,
  };
}

function PlayerPanel({
  player, color, label, flip, onAttack, disabled, isSingleMode
}) {
  const { hp, combo, input, question, shake, fire, feedback, setInput, nextQ, setHp, setCombo, triggerFire, triggerShake, setFeedback } = player;

  const handleKey = useCallback((k) => {
    if (disabled) return;
    if (k === '⌫') {
      setInput(prev => prev.slice(0, -1));
    } else if (k === '✓') {
      const ans = parseInt(input, 10);
      if (isNaN(ans)) return;
      if (ans === question.answer) {
        const newCombo = combo + 1;
        setCombo(newCombo);
        const dmg = calcDamage(newCombo);
        setFeedback('correct');
        triggerFire();
        onAttack(dmg);
        setInput('');
        nextQ();
        setTimeout(() => setFeedback(null), 600);
      } else {
        setCombo(0);
        setFeedback('wrong');
        triggerShake();
        setInput('');
        setTimeout(() => setFeedback(null), 600);
      }
    } else {
      if (input.length < 6) setInput(prev => prev + k);
    }
  }, [disabled, input, question, combo, onAttack, nextQ, setInput, setCombo, triggerFire, triggerShake, setFeedback]);

  // Keyboard input support
  useEffect(() => {
    if (isSingleMode) {
      const handler = (e) => {
        if (e.key >= '0' && e.key <= '9') handleKey(e.key);
        else if (e.key === 'Backspace') handleKey('⌫');
        else if (e.key === 'Enter') handleKey('✓');
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [isSingleMode, handleKey]);

  const comboLabel = combo >= 5 ? '🔥 FEVER x5!' : combo >= 3 ? '⚡ COMBO x3!' : combo >= 2 ? `COMBO x${combo}` : '';

  return (
    <div className={`flex flex-col gap-3 flex-1 ${flip ? 'items-end' : 'items-start'}`}>
      <HPBar hp={hp} color={color} label={label} flip={flip} />

      <div className="relative w-full flex justify-center">
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CastleSVG color={color} flip={flip} hp={hp} shake={shake} />
        </motion.div>
        <Cannonball fire={fire} fromRight={flip} />
      </div>

      {/* 題目 & 輸入 */}
      <div
        className="w-full rounded-2xl p-3 flex flex-col gap-2"
        style={{ background: `${color}22`, border: `2px solid ${color}66` }}
      >
        <div className="text-center text-2xl font-bold tracking-widest">
          {question.question} = ?
        </div>

        <div className="relative">
          <div
            className="w-full text-center text-3xl font-mono font-bold py-3 rounded-xl"
            style={{
              background: feedback === 'correct' ? '#22c55e44'
                : feedback === 'wrong' ? '#ef444444'
                : '#ffffff15',
              border: `2px solid ${feedback === 'correct' ? '#22c55e' : feedback === 'wrong' ? '#ef4444' : '#ffffff30'}`,
              transition: 'background 0.2s, border 0.2s',
              minHeight: 60,
            }}
          >
            {input || <span className="opacity-30">_</span>}
          </div>
          {feedback === 'correct' && (
            <div className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none">✅</div>
          )}
          {feedback === 'wrong' && (
            <div className="absolute inset-0 flex items-center justify-center text-2xl pointer-events-none">❌</div>
          )}
        </div>

        {comboLabel && (
          <div className="text-center text-sm font-bold text-yellow-300 animate-pulse">{comboLabel}</div>
        )}

        <VirtualKeyboard onKey={handleKey} color={color} />
      </div>
    </div>
  );
}

export default function GameScreen({ config, onEnd }) {
  const { mode, level, time } = config;
  const isSingle = mode === 0;
  const [timeLeft, setTimeLeft] = useState(time);
  const [blueHp, setBlueHp] = useState(100);
  const [redHp, setRedHp] = useState(100);

  const bluePlayer = usePlayer(level);
  const redPlayer = usePlayer(level);

  // sync hp refs so player panels can read opponent hp
  bluePlayer.hp = blueHp;
  bluePlayer.setHp = setBlueHp;
  redPlayer.hp = redHp;
  redPlayer.setHp = setRedHp;

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Check end
  useEffect(() => {
    if (blueHp <= 0 || redHp <= 0 || timeLeft === 0) {
      const winner = blueHp <= 0 ? 'red' : redHp <= 0 ? 'blue' : blueHp > redHp ? 'blue' : redHp > blueHp ? 'red' : 'draw';
      setTimeout(() => onEnd({ winner, blueHp, redHp }), 600);
    }
  }, [blueHp, redHp, timeLeft]);

  const attackRed = useCallback((dmg) => setRedHp(h => Math.max(0, h - dmg)), []);
  const attackBlue = useCallback((dmg) => setBlueHp(h => Math.max(0, h - dmg)), []);

  const timerColor = timeLeft <= 10 ? 'text-red-400 animate-pulse' : timeLeft <= 30 ? 'text-yellow-300' : 'text-white';

  return (
    <div className="min-h-screen flex flex-col px-2 py-3 gap-3 max-w-2xl mx-auto">
      {/* Timer */}
      <div className="flex justify-center">
        <div className={`text-5xl font-mono font-bold ${timerColor} bg-white/10 px-6 py-2 rounded-2xl`}>
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      {/* 雙方面板 */}
      <div className="flex gap-3 flex-1">
        <PlayerPanel
          player={bluePlayer}
          color={BLUE}
          label="藍隊"
          flip={false}
          onAttack={attackRed}
          disabled={blueHp <= 0 || redHp <= 0 || timeLeft === 0}
          isSingleMode={isSingle}
        />
        <div className="flex flex-col items-center justify-center gap-2 px-1">
          <div className="text-2xl">⚔️</div>
          <div className="w-px flex-1 bg-white/20" />
          <div className="text-2xl">VS</div>
          <div className="w-px flex-1 bg-white/20" />
          <div className="text-2xl">🛡️</div>
        </div>
        <PlayerPanel
          player={redPlayer}
          color={RED}
          label="紅隊"
          flip={true}
          onAttack={attackBlue}
          disabled={isSingle || blueHp <= 0 || redHp <= 0 || timeLeft === 0}
          isSingleMode={false}
        />
      </div>
    </div>
  );
}
