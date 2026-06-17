import {
  ref, set, get, update, remove, runTransaction,
  onDisconnect, serverTimestamp, onValue, off,
} from 'firebase/database';
import { rtdb } from '../firebase';
import { generateQuestion } from '../gameLogic';
import { teamMaxHp } from '../theme';

function genCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function newTeam(level, teamSize) {
  return {
    hp: teamMaxHp(teamSize),
    maxHp: teamMaxHp(teamSize),
    score: 0, combo: 0, turnIndex: 0,
    currentQuestion: generateQuestion(level),
    members: {},
  };
}

/** 創建房間，建立者為藍隊 slot 0。回傳 { code, side, slot } */
export async function createRoom({ uid, nickname, level, time, teamSize }) {
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const snap = await get(ref(rtdb, `rooms/${code}`));
    if (!snap.exists()) break;
    code = genCode();
  }
  const roomRef = ref(rtdb, `rooms/${code}`);
  const blue = newTeam(level, teamSize);
  const red = newTeam(level, teamSize);
  blue.members['0'] = { uid, nickname, ready: false, correct: 0 };

  await set(roomRef, {
    gameState: 'waiting',
    difficulty: level, time, teamSize, winner: null,
    createdAt: serverTimestamp(),
    blue, red,
  });
  onDisconnect(roomRef).remove();
  return { code, side: 'blue', slot: 0 };
}

function countMembers(team) {
  return team && team.members ? Object.keys(team.members).length : 0;
}

/** 加入房間：自動分配到人較少的一隊的空位。回傳 { side, slot, level, time, teamSize } */
export async function joinRoom({ code, uid, nickname }) {
  const roomRef = ref(rtdb, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error('房間不存在');
  const room = snap.val();
  if (room.gameState !== 'waiting') throw new Error('遊戲已開始');

  const ts = room.teamSize;
  let side = countMembers(room.blue) <= countMembers(room.red) ? 'blue' : 'red';
  if (countMembers(room.blue) >= ts && countMembers(room.red) >= ts) {
    throw new Error('房間已滿');
  }
  if (countMembers(room[side]) >= ts) side = side === 'blue' ? 'red' : 'blue';

  // 找空位 slot
  const used = room[side]?.members ? Object.keys(room[side].members).map(Number) : [];
  let slot = 0;
  while (used.includes(slot)) slot += 1;

  const result = await runTransaction(ref(rtdb, `rooms/${code}/${side}/members/${slot}`), (cur) => {
    if (cur) return; // 已被搶
    return { uid, nickname, ready: false, correct: 0 };
  });
  if (!result.committed) throw new Error('座位已被佔用，請重試');

  onDisconnect(ref(rtdb, `rooms/${code}/${side}/members/${slot}`)).remove();
  return { side, slot, level: room.difficulty, time: room.time, teamSize: ts };
}

/** 設定某玩家準備狀態 */
export async function setReady(code, side, slot, value) {
  await update(ref(rtdb, `rooms/${code}/${side}/members/${slot}`), { ready: value });
}

/** 由房主呼叫：所有座位皆已就緒 → 開戰 */
export async function startGame(code, { level, time }) {
  await update(ref(rtdb, `rooms/${code}`), {
    gameState: 'playing',
    startAt: serverTimestamp(),
    durationSec: time,
    'blue/currentQuestion': generateQuestion(level),
    'red/currentQuestion': generateQuestion(level),
  });
}

/** 房間是否滿員且全部就緒 */
export function roomReadyToStart(room) {
  if (!room) return false;
  const ts = room.teamSize;
  const sides = ['blue', 'red'];
  for (const s of sides) {
    const m = room[s]?.members || {};
    if (Object.keys(m).length < ts) return false;
    if (!Object.values(m).every((p) => p.ready)) return false;
  }
  return true;
}

/** 離開房間 */
export async function leaveRoom(code, side, slot) {
  const room = (await get(ref(rtdb, `rooms/${code}`))).val();
  if (!room) return;
  // 房主（藍隊 slot0）離開 → 解散
  if (side === 'blue' && slot === 0) {
    await remove(ref(rtdb, `rooms/${code}`));
  } else {
    await remove(ref(rtdb, `rooms/${code}/${side}/members/${slot}`));
  }
}

/* ============ 隨機匹配（1v1） ============ */

/**
 * 加入隨機佇列。偵測到另一名玩家即建立房間。
 * onMatched({code, side, slot, level, time, teamSize})
 * 回傳取消函式。
 */
export function joinRandomQueue({ uid, nickname, level, time }, onMatched) {
  const myRef = ref(rtdb, `randomQueue/${uid}`);
  onDisconnect(myRef).remove();
  // 用 Date.now() 而非 serverTimestamp() —— 避免初次回傳 null 導致排序不穩
  set(myRef, { uid, nickname, level, time, joinedAt: Date.now() });

  const queueRef   = ref(rtdb, 'randomQueue');
  const notifyRef  = ref(rtdb, `randomNotify/${uid}`);
  let done = false;
  let unsubQueue, unsubNotify;

  const cleanup = () => {
    if (unsubQueue)  { unsubQueue();  unsubQueue  = null; }
    if (unsubNotify) { unsubNotify(); unsubNotify = null; }
  };

  unsubQueue = onValue(queueRef, async (snap) => {
    if (done) return;
    const q = snap.val();
    if (!q) return;
    // 排序：先按加入時間，同秒以 uid 字典序決勝，確保兩端一致
    const players = Object.values(q).sort((a, b) => {
      const dt = (a.joinedAt || 0) - (b.joinedAt || 0);
      return dt !== 0 ? dt : (a.uid < b.uid ? -1 : 1);
    });
    if (players.length < 2) return;

    const [first, second] = players;
    if (first.uid !== uid) return;   // 只由「第一位」負責建房
    done = true;
    cleanup();

    const code = genCode();
    const lvl = first.level;
    const t   = first.time;
    const blue = newTeam(lvl, 1);
    const red  = newTeam(lvl, 1);
    blue.members['0'] = { uid: first.uid,  nickname: first.nickname,  ready: true, correct: 0 };
    red.members['0']  = { uid: second.uid, nickname: second.nickname, ready: true, correct: 0 };

    await set(ref(rtdb, `rooms/${code}`), {
      gameState: 'playing',
      difficulty: lvl, time: t, teamSize: 1, winner: null,
      startAt: serverTimestamp(), durationSec: t,
      createdAt: serverTimestamp(),
      blue, red,
    });

    await remove(ref(rtdb, `randomQueue/${first.uid}`));
    await remove(ref(rtdb, `randomQueue/${second.uid}`));
    await set(ref(rtdb, `randomNotify/${second.uid}`), { code, side: 'red', slot: 0, level: lvl, time: t });

    onMatched({ code, side: 'blue', slot: 0, level: lvl, time: t, teamSize: 1 });
  });

  // 第二位玩家（red）收通知
  unsubNotify = onValue(notifyRef, (snap) => {
    const data = snap.val();
    if (data && data.code && !done) {
      done = true;
      cleanup();
      remove(notifyRef);
      onMatched({ ...data, teamSize: 1 });
    }
  });

  return () => {
    cleanup();
    remove(myRef);
    onDisconnect(myRef).cancel();
  };
}

export async function leaveRandomQueue(uid) {
  await remove(ref(rtdb, `randomQueue/${uid}`));
}

/* ============ 房間清單 ============ */

/** 即時訂閱所有「等待中且未滿」的房間，回傳 unsubscribe */
export function subscribeOpenRooms(callback) {
  const roomsRef = ref(rtdb, 'rooms');
  const listener = onValue(roomsRef, (snap) => {
    const all = snap.val() || {};
    const list = Object.entries(all)
      .map(([code, r]) => ({ code, ...r }))
      .filter((r) => r.gameState === 'waiting')
      .map((r) => {
        const ts = r.teamSize;
        const filled = countMembers(r.blue) + countMembers(r.red);
        const host = r.blue?.members?.['0']?.nickname || '???';
        return { ...r, filled, capacity: ts * 2, host, full: filled >= ts * 2 };
      })
      .filter((r) => !r.full)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(list);
  });
  return () => off(roomsRef, 'value', listener);
}
