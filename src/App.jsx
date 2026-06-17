import { useState, useEffect } from 'react';
import AuthScreen from './screens/AuthScreen';
import LobbyScreen from './screens/LobbyScreen';
import RoomScreen from './screens/RoomScreen';
import RandomMatchScreen from './screens/RandomMatchScreen';
import RoomBrowserScreen from './screens/RoomBrowserScreen';
import OnlineGameScreen from './screens/OnlineGameScreen';
import LocalGameScreen from './screens/LocalGameScreen';
import ResultScreen from './screens/ResultScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import { watchAuth, logOut } from './firebase';
import { createRoom, joinRoom } from './services/matchmaking';
import useGameAudio from './useGameAudio';

// 訪客每次 session 產生唯一 uid（避免多訪客衝突）
function makeGuestUser() {
  return {
    uid: 'guest-' + Math.random().toString(36).slice(2, 10),
    displayName: '訪客騎士',
    email: null,
    isAnonymous: true,
  };
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [guestUser, setGuestUser] = useState(null);
  const [screen, setScreen] = useState('lobby');
  const [config, setConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => watchAuth((u) => setFirebaseUser(u || null)), []);

  // 背景音樂：對戰畫面 battle，其餘 menu，切換即重播
  const loggedIn = !!(guestUser ?? firebaseUser);
  const { muted, toggleMute } = useGameAudio(loggedIn ? screen : 'auth');

  const user = guestUser ?? firebaseUser;

  if (!guestUser && firebaseUser === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-xl" style={{ color: 'var(--ink-soft)' }}>載入中…</div>;
  }
  if (!user) return (
    <>
      <AuthScreen onGuest={() => setGuestUser(makeGuestUser())} />
      <MuteButton muted={muted} onClick={toggleMute} />
    </>
  );

  const isGuest = !!guestUser;
  const nickname = isGuest ? '訪客騎士' : (user.displayName || user.email);

  const handleCreate = async (cfg) => {
    try {
      const { code, side, slot } = await createRoom({ ...cfg, uid: user.uid, nickname });
      setConfig({ ...cfg, code, side, slot, nickname, isGuest });
      setScreen('room');
    } catch (e) { setToast('創建失敗：' + e.message); }
  };

  const handleJoin = async (cfg) => {
    try {
      const r = await joinRoom({ code: cfg.code, uid: user.uid, nickname });
      setConfig({ ...cfg, ...r, code: cfg.code, nickname, isGuest });
      setScreen('room');
    } catch (e) { setToast(e.message); }
  };

  const handleRandom = (cfg) => {
    setConfig({ ...cfg, uid: user.uid, nickname, isGuest });
    setScreen('random');
  };

  const handleLocal = (cfg) => {
    setConfig({ ...cfg, isGuest });
    setScreen('local');
  };

  const onMatched = (cfg) => { setConfig({ ...cfg, isGuest }); setScreen('online'); };
  const onStart = (cfg) => { setConfig({ ...cfg, isGuest }); setScreen('online'); };
  const handleEnd = (res) => { setResult({ ...res, isGuest }); setScreen('result'); };
  const goLobby = () => { setScreen('lobby'); setConfig(null); setResult(null); };

  const handleLogout = () => {
    if (isGuest) setGuestUser(null);
    else logOut();
  };

  return (
    <>
      {screen === 'lobby' && (
        <LobbyScreen user={user} onCreate={handleCreate} onJoin={handleJoin}
          onRandom={handleRandom} onLocal={handleLocal} onBrowse={() => setScreen('browse')}
          onLeaderboard={() => setScreen('leaderboard')} onLogout={handleLogout} />
      )}
      {screen === 'browse' && (
        <RoomBrowserScreen onBack={goLobby} onJoinCode={(code) => handleJoin({ code })} />
      )}
      {screen === 'room' && config && <RoomScreen config={config} onStart={onStart} onLeave={goLobby} />}
      {screen === 'random' && config && <RandomMatchScreen config={config} onMatched={onMatched} onCancel={goLobby} />}
      {screen === 'online' && config && <OnlineGameScreen key={config.roomId} config={config} onEnd={handleEnd} />}
      {screen === 'local' && config && <LocalGameScreen config={config} onEnd={handleEnd} />}
      {screen === 'result' && result && <ResultScreen result={result} onRestart={goLobby} />}
      {screen === 'leaderboard' && <LeaderboardScreen user={user} onBack={goLobby} />}

      {toast && (
        <div onClick={() => setToast(null)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-white font-bold shadow-lg cursor-pointer"
          style={{ background: '#b3261e' }}>
          {toast}（點擊關閉）
        </div>
      )}

      <MuteButton muted={muted} onClick={toggleMute} />
    </>
  );
}

// 右下角浮動音效鍵
function MuteButton({ muted, onClick }) {
  return (
    <button onClick={onClick} title={muted ? '開啟音效' : '靜音'}
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 50,
        width: 48, height: 48, borderRadius: '50%',
        background: muted ? '#b3261e' : '#5a8f3c', color: '#fff',
        border: '2px solid #fffdf5', boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
        fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
