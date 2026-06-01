import { motion } from 'framer-motion';
import { BLUE, RED } from '../theme';

export default function ResultScreen({ result, onRestart }) {
  const { winner, blueHp, redHp, online, resultText } = result;

  const isWin = online && resultText === '勝利';
  const isLose = online && resultText === '落敗';

  const title = online
    ? (isWin ? '🏆 勝利！' : isLose ? '🛡️ 落敗' : '🤝 平局')
    : winner === 'blue' ? '🏆 藍隊勝利' : winner === 'red' ? '🏆 紅隊勝利' : '🤝 平局';

  const subtitle = isWin ? '王國因你而屹立不搖！'
    : isLose ? '重整旗鼓，再戰一場！'
    : '勢均力敵的對決！';

  const titleColor = isLose ? '#A32D2D' : '#7a3b1d';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-7 px-4">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-center"
      >
        <div className="text-8xl mb-3">{winner === 'draw' ? '🏳️' : isWin ? '🎉' : '🏰'}</div>
        <h1 className="medieval-title text-5xl font-bold mb-2" style={{ color: titleColor }}>{title}</h1>
        <p style={{ color: 'var(--ink-soft)' }}>{subtitle}</p>
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="parchment p-6 w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-center font-bold" style={{ color: 'var(--ink-soft)' }}>最終戰況</h2>
        <div className="flex justify-around items-center">
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xl">🏰</div>
            <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>藍隊</div>
            <div className="text-3xl font-mono font-bold" style={{ color: BLUE }}>{Math.max(0, blueHp)}</div>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--ink-soft)' }}>VS</div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xl">🏰</div>
            <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>紅隊</div>
            <div className="text-3xl font-mono font-bold" style={{ color: RED }}>{Math.max(0, redHp)}</div>
          </div>
        </div>
        {online && (
          <p className="text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
            積分變化：{isWin ? '+25' : isLose ? '-25' : '±0'} ELO（已記入排行榜）
          </p>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onRestart}
        className="px-8 py-4 font-bold text-lg rounded-2xl text-white shadow-xl transition-all hover:scale-105 active:scale-95"
        style={{ background: '#c9a227' }}
      >
        🔄 返回大廳
      </motion.button>
    </div>
  );
}
