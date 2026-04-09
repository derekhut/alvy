import type { UserData } from "./types.js";

/** XP required to reach a given level */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * level * level);
}

/** Compute current level from total XP (capped at 20) */
export function computeLevel(totalXP: number): number {
  for (let level = 20; level >= 1; level--) {
    if (totalXP >= xpForLevel(level)) return level;
  }
  return 1;
}

/** XP progress towards next level */
export function xpToNextLevel(totalXP: number): { current: number; needed: number; progress: number } {
  const level = computeLevel(totalXP);
  if (level >= 20) return { current: 0, needed: 0, progress: 1 };
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const needed = nextThreshold - currentThreshold;
  const current = totalXP - currentThreshold;
  return { current, needed, progress: needed > 0 ? current / needed : 1 };
}

/** Compute composite score (0-100) blending accuracy, consistency, volume */
export function computeCompositeScore(data: UserData): number {
  const lp = data.levelProgress;

  const accuracy = lp.totalQuizAttempts > 0
    ? (lp.totalCorrectQuiz / lp.totalQuizAttempts) * 100
    : 0;
  const consistency = Math.min(data.streak.current / 30, 1) * 100;
  const volume = Math.min(lp.totalWordsStudied / 200, 1) * 100;

  return Math.round(accuracy * 0.5 + consistency * 0.3 + volume * 0.2);
}

/** Check if user leveled up; updates data.levelProgress in place */
export function checkLevelUp(data: UserData): { leveledUp: boolean; newLevel: number; oldLevel: number } {
  const oldLevel = data.levelProgress.level;
  const newLevel = computeLevel(data.xp.total);
  data.levelProgress.level = newLevel;
  data.levelProgress.compositeScore = computeCompositeScore(data);
  return { leveledUp: newLevel > oldLevel, newLevel, oldLevel };
}
