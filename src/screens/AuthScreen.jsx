import { useState } from 'react';
import { motion } from 'framer-motion';
import { signUpEmail, signInEmail } from '../firebase';
import { ensureUserDoc } from '../services/gameSync';

export default function AuthScreen() {
  const [tab, setTab] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email || !password) { setError('請輸入 Email 與密碼'); return; }
    if (tab === 'signup' && !nickname.trim()) { setError('請輸入騎士暱稱'); return; }
    setBusy(true);
    try {
      if (tab === 'signup') {
        const u = await signUpEmail(email.trim(), password, nickname.trim());
        await ensureUserDoc(u.uid, nickname.trim());
      } else {
        const u = await signInEmail(email.trim(), password);
        await ensureUserDoc(u.uid, u.displayName || email.split('@')[0]);
      }
      // onAuth 監聽會自動切換畫面
    } catch (e) {
      setError(translate(e.code) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-8">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
        <div className="text-6xl mb-1">🏰</div>
        <h1 className="medieval-title text-4xl font-bold" style={{ color: '#7a3b1d' }}>城堡攻防戰</h1>
        <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>～ 進入王國前，請先登入 ～</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="parchment p-6 w-full max-w-sm flex flex-col gap-4">
        <div className="flex gap-2">
          {['login', 'signup'].map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(null); }}
              className="flex-1 py-2 rounded-xl font-bold transition-all"
              style={{ background: tab === t ? '#7a3b1d' : '#fffdf5', border: '2px solid #d8c290', color: tab === t ? '#fff' : 'var(--ink)' }}>
              {t === 'login' ? '登入' : '註冊'}
            </button>
          ))}
        </div>

        {tab === 'signup' && (
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={12} placeholder="騎士暱稱"
            className="px-4 py-3 rounded-xl outline-none" style={inputStyle} />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email（例：name@gmail.com）"
          className="px-4 py-3 rounded-xl outline-none" style={inputStyle} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密碼（至少 6 碼）"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="px-4 py-3 rounded-xl outline-none" style={inputStyle} />

        {error && <p className="text-sm" style={{ color: '#b3261e' }}>{error}</p>}

        <button onClick={submit} disabled={busy}
          className="w-full py-3 font-bold text-lg rounded-2xl text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
          style={{ background: '#c9a227' }}>
          {busy ? '處理中…' : tab === 'login' ? '⚔️ 登入王國' : '✨ 建立帳號'}
        </button>
        <p className="text-xs text-center" style={{ color: 'var(--ink-soft)' }}>
          使用 Email/密碼帳號（需先在 Firebase 啟用）
        </p>
      </motion.div>
    </div>
  );
}

const inputStyle = { background: '#fffdf5', border: '2px solid #d8c290', color: 'var(--ink)' };

function translate(code) {
  const map = {
    'auth/invalid-email': 'Email 格式錯誤',
    'auth/email-already-in-use': '此 Email 已被註冊，請改用登入',
    'auth/weak-password': '密碼太弱，至少 6 碼',
    'auth/invalid-credential': 'Email 或密碼錯誤',
    'auth/user-not-found': '找不到帳號，請先註冊',
    'auth/wrong-password': '密碼錯誤',
    'auth/operation-not-allowed': '尚未在 Firebase 啟用 Email 登入',
  };
  return map[code];
}
