import { useState, useEffect } from 'react';
import AuthScreen from './screens/AuthScreen';
import LobbyScreen from './screens/LobbyScreen';
import RoomScreen from './screens/RoomScreen';
import RandomMatchScreen from './screens/RandomMatchScreen';
import RoomBrowserScreen from './screens/RoomBrowserScreen';
import OnlineGameScreen from './screens/OnlineGameScreen';
import ResultScreen from './screens/ResultScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import { watchAuth, logOut } from './firebase';
import { createRoom, joinRoom } from './services/matchmaking';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined=載入中, null=未登入
  const [screen, setScreen] = useState('lobby');
  const [config, setConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => watchAuth((u) => setUser(u || null)), []);

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-xl" style={{ color: 'var(--ink-soft)' }}>載入中…</div>;
  }
  if (!user) return <AuthScreen />;

  const handleCreate = async (cfg) => {
    try {
      const { code, side, slot } = await createRoom({ ...cfg, uid: user.uid, nickname: user.displayName || user.email });
      setConfig({ ...cfg, code, side, slot, nickname: user.displayName || user.email });
      setScreen('room');
    } catch (e) { setToast('創建失敗：' + e.message); }
  };

  const handleJoin = async (cfg) => {
    try {
      const r = await joinRoom({ code: cfg.code, uid: user.uid, nickname: user.displayName || user.email });
      setConfig({ ...cfg, ...r, code: cfg.code, nickname: user.displayName || user.email });
      setScreen('room');
    } catch (e) { setToast(e.message); }
  };

  const handleRandom = (cfg) => {
    setConfig({ ...cfg, uid: user.uid, nickname: user.displayName || user.email });
    setScreen('random');
  };

  const onMatched = (cfg) => { setConfig(cfg); setScreen('online'); };
  const onStart = (cfg) => { setConfig(cfg); setScreen('online'); };
  const handleEnd = (res) => { setResult(res); setScreen('result'); };
  const goLobby = () => { setScreen('lobby'); setConfig(null); setResult(null); };

  return (
    <>
      {screen === 'lobby' && (
        <LobbyScreen user={user} onCreate={handleCreate} onJoin={handleJoin}
          onRandom={handleRandom} onBrowse={() => setScreen('browse')}
          onLeaderboard={() => setScreen('leaderboard')} onLogout={() => logOut()} />
      )}
      {screen === 'browse' && (
        <RoomBrowserScreen onBack={goLobby} onJoinCode={(code) => handleJoin({ code })} />
      )}
      {screen === 'room' && config && <RoomScreen config={config} onStart={onStart} onLeave={goLobby} />}
      {screen === 'random' && config && <RandomMatchScreen config={config} onMatched={onMatched} onCancel={goLobby} />}
      {screen === 'online' && config && <OnlineGameScreen key={config.roomId} config={config} onEnd={handleEnd} />}
      {screen === 'result' && result && <ResultScreen result={result} onRestart={goLobby} />}
      {screen === 'leaderboard' && <LeaderboardScreen user={user} onBack={goLobby} />}

      {toast && (
        <div onClick={() => setToast(null)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-white font-bold shadow-lg cursor-pointer"
          style={{ background: '#b3261e' }}>
          {toast}（點擊關閉）
        </div>
      )}
    </>
  );
}
