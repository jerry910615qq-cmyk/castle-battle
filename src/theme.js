// 隊伍色
export const BLUE = '#185FA5';
export const RED = '#A32D2D';

// 中世紀風格階段（不顯示加減法說明）
export const LEVELS = [
  { id: 1, label: '見習侍從', emoji: '🛡️', mult: 1 },
  { id: 2, label: '王國騎士', emoji: '⚔️', mult: 2 },
  { id: 3, label: '龍焰領主', emoji: '🐉', mult: 3 },
];

export const TIMES = [60, 120, 180];

// 遊玩模式（teamSize 0 = 隨機 1v1）
export const MODES = [
  { id: 'random', label: '隨機匹配', emoji: '🎲', teamSize: 1, desc: '自動配對一名對手' },
  { id: '1v1', label: '1 對 1', emoji: '⚔️', teamSize: 1, desc: '房號單挑' },
  { id: '2v2', label: '2 對 2', emoji: '🛡️', teamSize: 2, desc: '輪流答題 · 200HP' },
  { id: '3v3', label: '3 對 3', emoji: '🏰', teamSize: 3, desc: '輪流答題 · 300HP' },
];

export const QUESTION_TIME = 15; // 每題作答秒數，逾時換題

export function levelLabel(id) {
  return LEVELS.find((l) => l.id === id)?.label ?? `階段 ${id}`;
}
export function difficultyMult(id) {
  return LEVELS.find((l) => l.id === id)?.mult ?? 1;
}
export function teamMaxHp(teamSize) {
  return teamSize * 100;
}
