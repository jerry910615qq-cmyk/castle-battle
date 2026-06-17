import { useState } from 'react';
import { motion } from 'framer-motion';
import { LEVELS, TIMES, MODES } from '../theme';

// 線上模式：排除 random 和 local（random 改成選模式後的按鈕）
const ONLINE_MODES = MODES.filter((m) => m.id !== 'local' && m.id !== 'random');

export default function LobbyScreen({ user, onCreate, onJoin, onRandom, onLocal, onBrowse, onLeaderboard, onLogout }) {
  const [mode, setMode] = useState('1v1');
  const [level, setLevel] = useState(1);
  const [time, setTime] = useState(120);
  const [joinCode, setJoinCode] = useState('');

  const selectedMode = MODES.find((m) => m.id === mode);
  const isGuest = user.isAnonymous;

  const handleCreate = () => onCreate({ level, time, teamSize: selectedMode.teamSize });
  const handleRandom = () => onRandom({ level, time, teamSize: selectedMode.teamSize });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-8">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
        <div className="text-6xl mb-1">🏰</div>
        <h1 className="medieval-title text-4xl font-bold" style={{ color: '#7a3b1d' }}>城堡攻防戰</h1>
        <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>～ 王國數學試煉 ～</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="parchment p-6 w-full max-w-md flex flex-col gap-5">

        {/* 登入狀態 */}
        <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#fffdf5', border: '2px solid #d8c290' }}>
          <div className="text-sm" style={{ color: 'var(--ink)' }}>
            {isGuest ? '🎭' : '🔥'} <b>{user.displayName || user.email || '訪客騎士'}</b>
            {isGuest
              ? <div className="text-xs" style={{ color: '#b8860b' }}>訪客模式・成績不計入排行</div>
              : <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{user.email}</div>
            }
          </div>
          <button onClick={onLogout} className="text-xs px-3 py-1 rounded-lg font-bold"
            style={{ background: '#efe2c4', color: 'var(--ink)' }}>登出</button>
        </div>

        {/* ── 同台對戰（特殊模式） ── */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'linear-gradient(135deg,#fff8e8,#f6ecd6)', border: '2px dashed #c9a227' }}>
          <div className="text-center">
            <span className="text-2xl">🖥️</span>
            <span className="font-bold ml-2" style={{ color: '#7a3b1d' }}>同台對戰</span>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>兩人共用一台裝置・左右分欄同時答題・適合課堂投影</div>
          </div>
          <button
            onClick={() => onLocal({ level, time })}
            className="w-full py-3 font-bold text-lg rounded-2xl text-white shadow-lg transition-all hover:scale-105 active:scale-95"
            style={{ background: '#c9a227' }}>
            ⚔️ 開始同台對戰
          </button>
        </div>

        {/* 分隔 */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: '#d8c290' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>線上對戰</span>
          <div className="flex-1 h-px" style={{ background: '#d8c290' }} />
        </div>

        {/* 對戰模式選擇（不含隨機） */}
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>遊玩模式</p>
          <div className="grid grid-cols-3 gap-2">
            {ONLINE_MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="py-2 rounded-xl font-bold transition-all text-center"
                style={{
                  background: mode === m.id ? '#7a3b1d' : '#fffdf5',
                  border: '2px solid #d8c290',
                  color: mode === m.id ? '#fff' : 'var(--ink)',
                }}>
                <span className="text-lg mr-1">{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
          <p className="text-xs mt-1 text-center" style={{ color: 'var(--ink-soft)' }}>{selectedMode?.desc}</p>
        </div>

        {/* 難度 */}
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>試煉等級</p>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => setLevel(l.id)}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${level === l.id ? 'scale-[1.03] shadow-lg' : ''}`}
                style={{ background: level === l.id ? '#7a3b1d' : '#fffdf5', border: '2px solid #d8c290', color: level === l.id ? '#fff' : 'var(--ink)' }}>
                <div className="text-2xl">{l.emoji}</div>
                <div className="text-sm">{l.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 時間 */}
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--ink-soft)' }}>戰鬥時間</p>
          <div className="flex gap-2">
            {TIMES.map((t) => (
              <button key={t} onClick={() => setTime(t)} className="flex-1 py-2 rounded-xl font-bold transition-all"
                style={{ background: time === t ? '#5a8f3c' : '#fffdf5', border: '2px solid #d8c290', color: time === t ? '#fff' : 'var(--ink)' }}>
                {t}秒
              </button>
            ))}
          </div>
        </div>

        {/* 主要操作：建立房間 + 隨機配對 */}
        <div className="flex gap-2">
          <button onClick={handleCreate}
            className="flex-1 py-4 font-bold text-base rounded-2xl text-white shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: '#185FA5' }}>
            🏰 建立房間
          </button>
          <button onClick={handleRandom}
            className="flex-1 py-4 font-bold text-base rounded-2xl text-white shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: '#5a8f3c' }}>
            🎲 隨機配對
          </button>
        </div>

        {/* 加入房間（輸入房號） */}
        <div className="flex gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="輸入 4 位房號" className="flex-1 px-4 py-3 rounded-xl outline-none text-center text-lg tracking-widest font-mono"
            style={{ background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' }} />
          <button onClick={() => onJoin({ code: joinCode })} disabled={joinCode.length !== 4}
            className="px-6 py-3 font-bold rounded-xl text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{ background: '#A32D2D' }}>加入</button>
        </div>

        <button onClick={onBrowse}
          className="w-full py-3 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95"
          style={{ background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' }}>
          🔍 尋找戰場（瀏覽所有房間）
        </button>

        {!isGuest && (
          <button onClick={onLeaderboard}
            className="w-full py-3 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95"
            style={{ background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' }}>
            🏆 王國排行榜
          </button>
        )}
      </motion.div>
    </div>
  );
}
