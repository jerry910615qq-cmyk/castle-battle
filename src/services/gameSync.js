import {
  ref, onValue, off, update, runTransaction,
} from 'firebase/database';
import {
  doc, getDoc, setDoc, increment, collection, addDoc, serverTimestamp as fsTimestamp,
} from 'firebase/firestore';
import { rtdb, firestore } from '../firebase';
import { generateQuestion, calcDamage } from '../gameLogic';
import { difficultyMult } from '../theme';

export function subscribeRoom(roomId, callback) {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  const listener = onValue(roomRef, (snap) => {
    const data = snap.val();
    if (data) callback(data);
  });
  return () => off(roomRef, 'value', listener);
}

/**
 * 答對：僅當輪到該 slot 時生效。更新 combo/score/該員 correct/turnIndex/下一題，並扣對方血。
 */
export async function submitCorrect(roomId, mySide, slot, level, teamSize) {
  const oppSide = mySide === 'blue' ? 'red' : 'blue';
  const sideRef = ref(rtdb, `rooms/${roomId}/${mySide}`);
  let damage = 10;
  let applied = false;

  await runTransaction(sideRef, (team) => {
    if (!team) return team;
    if ((team.turnIndex || 0) !== slot) return team; // 不是你的回合
    applied = true;
    const newCombo = (team.combo || 0) + 1;
    damage = calcDamage(newCombo);
    const members = team.members || {};
    const me = members[slot] || {};
    members[slot] = { ...me, correct: (me.correct || 0) + 1 };
    return {
      ...team,
      combo: newCombo,
      score: (team.score || 0) + damage,   // 累積傷害（驅動騎士衝鋒動畫）
      solved: (team.solved || 0) + 1,       // 答對題數（顯示用）
      turnIndex: ((team.turnIndex || 0) + 1) % teamSize,
      currentQuestion: generateQuestion(level),
      members,
    };
  });

  if (!applied) return;

  const oppHpRef = ref(rtdb, `rooms/${roomId}/${oppSide}/hp`);
  let oppHp = 0;
  await runTransaction(oppHpRef, (hp) => {
    const cur = hp == null ? 100 : hp;
    oppHp = Math.max(0, cur - damage);
    return oppHp;
  });

  if (oppHp <= 0) {
    await update(ref(rtdb, `rooms/${roomId}`), { gameState: 'finished', winner: mySide });
  }
}

/** 答錯 / 逾時：換下一題、combo 歸零、輪到下一位 */
export async function submitWrong(roomId, mySide, slot, level, teamSize) {
  const sideRef = ref(rtdb, `rooms/${roomId}/${mySide}`);
  await runTransaction(sideRef, (team) => {
    if (!team) return team;
    if ((team.turnIndex || 0) !== slot) return team;
    return {
      ...team,
      combo: 0,
      turnIndex: ((team.turnIndex || 0) + 1) % teamSize,
      currentQuestion: generateQuestion(level),
    };
  });
}

/** 時間到：依血量判定，僅寫一次 */
export async function finishByTime(roomId) {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  await runTransaction(roomRef, (room) => {
    if (!room || room.gameState === 'finished') return room;
    const b = room.blue?.hp ?? 0;
    const r = room.red?.hp ?? 0;
    room.gameState = 'finished';
    room.winner = b > r ? 'blue' : r > b ? 'red' : 'draw';
    return room;
  });
}

/** 結算：更新雙方所有成員的 Firestore 統計與排行榜（加權積分） */
export async function settleMatch(roomId, room) {
  const { winner, difficulty } = room;
  const mult = difficultyMult(difficulty);

  const tasks = [];
  for (const side of ['blue', 'red']) {
    const team = room[side];
    const members = team?.members || {};
    const won = winner === side;
    const draw = winner === 'draw';
    for (const slot of Object.keys(members)) {
      const m = members[slot];
      if (!m?.uid) continue;
      tasks.push(applyResult(m.uid, m.nickname, won, draw, m.correct || 0, mult));
    }
  }
  await Promise.all(tasks);

  // 對戰紀錄（記錄在房主名下）
  const host = room.blue?.members?.['0'];
  if (host?.uid) {
    await addDoc(collection(firestore, `users/${host.uid}/matchHistory`), {
      roomId, difficulty, teamSize: room.teamSize, winner,
      blueHp: room.blue?.hp ?? 0, redHp: room.red?.hp ?? 0,
      playedAt: fsTimestamp(),
    });
  }
}

async function applyResult(uid, nickname, won, draw, correct, mult) {
  const weighted = correct * mult;
  const userRef = doc(firestore, `users/${uid}`);
  await setDoc(userRef, {
    nickname,
    stats: {
      wins: increment(won && !draw ? 1 : 0),
      losses: increment(!won && !draw ? 1 : 0),
      games: increment(1),
      totalCorrect: increment(correct),
      weightedScore: increment(weighted),
    },
  }, { merge: true });

  const lbRef = doc(firestore, `leaderboard/${uid}`);
  await setDoc(lbRef, {
    nickname,
    wins: increment(won && !draw ? 1 : 0),
    games: increment(1),
    totalCorrect: increment(correct),
    weightedScore: increment(weighted),
  }, { merge: true });
}

/** 確保使用者文件存在 */
export async function ensureUserDoc(uid, nickname) {
  const userRef = doc(firestore, `users/${uid}`);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      nickname,
      stats: { wins: 0, losses: 0, games: 0, totalCorrect: 0, weightedScore: 0 },
    });
  } else if (nickname) {
    await setDoc(userRef, { nickname }, { merge: true });
  }
}
