import { describe, it, expect } from "vitest";
import {
  xpForLevel,
  computeLevel,
  xpToNextLevel,
  computeCompositeScore,
  checkLevelUp,
} from "../levels.js";
import type { UserData } from "../types.js";

describe("xpForLevel", () => {
  it("level 1 requires 0 XP", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it("level 2 requires 200 XP", () => {
    expect(xpForLevel(2)).toBe(200);
  });

  it("level 5 requires 1250 XP", () => {
    expect(xpForLevel(5)).toBe(1250);
  });

  it("level 10 requires 5000 XP", () => {
    expect(xpForLevel(10)).toBe(5000);
  });

  it("level 20 requires 20000 XP", () => {
    expect(xpForLevel(20)).toBe(20000);
  });
});

describe("computeLevel", () => {
  it("0 XP is level 1", () => {
    expect(computeLevel(0)).toBe(1);
  });

  it("199 XP is still level 1", () => {
    expect(computeLevel(199)).toBe(1);
  });

  it("200 XP is level 2", () => {
    expect(computeLevel(200)).toBe(2);
  });

  it("1249 XP is level 4", () => {
    expect(computeLevel(1249)).toBe(4);
  });

  it("1250 XP is level 5", () => {
    expect(computeLevel(1250)).toBe(5);
  });

  it("caps at level 20", () => {
    expect(computeLevel(999999)).toBe(20);
  });
});

describe("xpToNextLevel", () => {
  it("at 0 XP, shows progress toward level 2", () => {
    const result = xpToNextLevel(0);
    expect(result.current).toBe(0);
    expect(result.needed).toBe(200);
    expect(result.progress).toBe(0);
  });

  it("at 100 XP, shows 50% toward level 2", () => {
    const result = xpToNextLevel(100);
    expect(result.current).toBe(100);
    expect(result.needed).toBe(200);
    expect(result.progress).toBe(0.5);
  });

  it("at max level, progress is 1", () => {
    const result = xpToNextLevel(20000);
    expect(result.progress).toBe(1);
  });
});

function makeData(overrides: Partial<UserData> = {}): UserData {
  return {
    version: 3,
    streak: { current: 0, longest: 0, lastDate: null, freezeAvailable: true },
    xp: { total: 0, today: 0 },
    dailyGoal: 3,
    rootProgress: {},
    wordsStudied: [],
    levelProgress: {
      level: 1,
      compositeScore: 0,
      totalStudyDays: 0,
      totalCorrectQuiz: 0,
      totalQuizAttempts: 0,
      totalWordsStudied: 0,
    },
    ...overrides,
  };
}

describe("computeCompositeScore", () => {
  it("returns 0 for fresh user", () => {
    expect(computeCompositeScore(makeData())).toBe(0);
  });

  it("100% accuracy with no streak or volume gives 50", () => {
    const data = makeData({
      levelProgress: {
        level: 1, compositeScore: 0, totalStudyDays: 0,
        totalCorrectQuiz: 10, totalQuizAttempts: 10, totalWordsStudied: 0,
      },
    });
    expect(computeCompositeScore(data)).toBe(50);
  });

  it("blends all three factors", () => {
    const data = makeData({
      streak: { current: 15, longest: 15, lastDate: "2026-04-01", freezeAvailable: true },
      levelProgress: {
        level: 5, compositeScore: 0, totalStudyDays: 15,
        totalCorrectQuiz: 8, totalQuizAttempts: 10, totalWordsStudied: 100,
      },
    });
    // accuracy = 80, consistency = 50, volume = 50
    // 80*0.5 + 50*0.3 + 50*0.2 = 40 + 15 + 10 = 65
    expect(computeCompositeScore(data)).toBe(65);
  });

  it("caps consistency and volume at 100", () => {
    const data = makeData({
      streak: { current: 60, longest: 60, lastDate: "2026-04-01", freezeAvailable: true },
      levelProgress: {
        level: 10, compositeScore: 0, totalStudyDays: 60,
        totalCorrectQuiz: 100, totalQuizAttempts: 100, totalWordsStudied: 500,
      },
    });
    // accuracy = 100, consistency = 100, volume = 100
    // 100*0.5 + 100*0.3 + 100*0.2 = 100
    expect(computeCompositeScore(data)).toBe(100);
  });
});

describe("checkLevelUp", () => {
  it("detects level-up when XP crosses threshold", () => {
    const data = makeData({
      xp: { total: 200, today: 200 },
      levelProgress: {
        level: 1, compositeScore: 0, totalStudyDays: 0,
        totalCorrectQuiz: 0, totalQuizAttempts: 0, totalWordsStudied: 0,
      },
    });
    const result = checkLevelUp(data);
    expect(result.leveledUp).toBe(true);
    expect(result.oldLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(data.levelProgress.level).toBe(2);
  });

  it("returns no change when level stays the same", () => {
    const data = makeData({
      xp: { total: 100, today: 100 },
      levelProgress: {
        level: 1, compositeScore: 0, totalStudyDays: 0,
        totalCorrectQuiz: 0, totalQuizAttempts: 0, totalWordsStudied: 0,
      },
    });
    const result = checkLevelUp(data);
    expect(result.leveledUp).toBe(false);
    expect(result.oldLevel).toBe(1);
    expect(result.newLevel).toBe(1);
  });
});
