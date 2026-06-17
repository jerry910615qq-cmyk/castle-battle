import { useEffect, useRef, useState } from 'react';
import menuUrl from './assets/audio/menu.mp3';
import battleUrl from './assets/audio/battle.mp3';

// 對戰畫面用 battle，其餘用 menu
const BATTLE_SCREENS = ['online', 'local'];

/**
 * 依目前畫面播放對應背景音樂；每次切換畫面都從頭重新播放。
 * 回傳 { muted, toggleMute }。
 */
export default function useGameAudio(screen) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);

  // 初始化單一 audio 元素
  if (!audioRef.current) {
    const a = new Audio();
    a.loop = true;
    a.volume = 0.5;
    audioRef.current = a;
  }

  // 畫面切換 → 換曲並從頭播放
  useEffect(() => {
    const a = audioRef.current;
    const wantBattle = BATTLE_SCREENS.includes(screen);
    const url = wantBattle ? battleUrl : menuUrl;

    a.src = url;
    a.currentTime = 0;
    if (!muted) {
      a.play().catch(() => { /* 瀏覽器需先有互動，靜默忽略 */ });
    }
    // 不在 cleanup 停止，讓切換時自然換曲
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // 靜音切換
  useEffect(() => {
    const a = audioRef.current;
    a.muted = muted;
    if (!muted && a.paused) {
      a.play().catch(() => {});
    }
  }, [muted]);

  // 卸載時停止
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  return { muted, toggleMute: () => setMuted((m) => !m) };
}
