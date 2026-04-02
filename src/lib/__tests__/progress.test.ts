import { describe, it, expect, beforeEach, vi } from "vitest";
import type { UserData, RootEntry } from "../types.js";
import {
  masteredCount,
  seenCount,
  updateStreak,
  addXP,
  markRootSeen,
  markWordStudied,
  selectNextMorphemes,
  generateStatsSummary,
  recordQuizResult,
  needsReview,
  selectReviewMorphemes,
} from "../progress.js";

function makeData(overrides?: Partial<UserData>): UserData {
  return {
    version: 2,
    streak: { current: 0, longest: 0, lastDate: null, freezeAvailable: true },
    xp: { total: 0, today: 0 },
    dailyGoal: 3,
    rootProgress: {},
    wordsStudied: [],
    settings: { sound: false, dailyGoal: 3 },
    ...overrides,
  };
}

function makeRoot(root: string, wordCount = 5): RootEntry {
  return {
    root,
    type: "root",
    meaning_en: "test",
    meaning_zh: "测试",
    origin: "Latin",
    related: [],
    words: Array.from({ length: wordCount }, (_, i) => ({
      word: `${root}-word${i}`,
      breakdown: "test",
      derivation: "test",
      meaning_en: "test",
      meaning_zh: "测试",
      example: "test sentence",
      example_zh: "测试句子",
      toefl_frequency: "high" as const,
    })),
  };
}

// --- masteredCount ---

describe("masteredCount", () => {
  it("returns 0 for empty progress", () => {
    const data = makeData();
    expect(masteredCount(data)).toBe(0);
  });

  it("counts roots with 5+ wordsStudied and seen=true", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
        "mal-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-01" },
        "pre-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
      },
    });
    expect(masteredCount(data)).toBe(2);
  });

  it("does not count unseen roots even with wordsStudied >= 5", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: false, wordsStudied: 5, lastStudied: "2026-04-01" },
      },
    });
    expect(masteredCount(data)).toBe(0);
  });
});

// --- seenCount ---

describe("seenCount", () => {
  it("returns 0 for empty progress", () => {
    const data = makeData();
    expect(seenCount(data)).toBe(0);
  });

  it("counts only roots with seen=true", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
        "mal-": { seen: false, wordsStudied: 0, lastStudied: null },
        "pre-": { seen: true, wordsStudied: 1, lastStudied: "2026-04-01" },
      },
    });
    expect(seenCount(data)).toBe(2);
  });
});

// --- updateStreak ---

describe("updateStreak", () => {
  it("same day: does nothing", () => {
    const today = new Date().toISOString().slice(0, 10);
    const data = makeData({
      streak: { current: 3, longest: 5, lastDate: today, freezeAvailable: true },
    });
    updateStreak(data);
    expect(data.streak.current).toBe(3);
    expect(data.streak.longest).toBe(5);
  });

  it("consecutive day: increments current", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const data = makeData({
      streak: { current: 3, longest: 5, lastDate: yesterday, freezeAvailable: true },
    });
    updateStreak(data);
    expect(data.streak.current).toBe(4);
    expect(data.streak.lastDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it("gap: resets current to 1", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const data = makeData({
      streak: { current: 5, longest: 5, lastDate: twoDaysAgo, freezeAvailable: true },
    });
    updateStreak(data);
    expect(data.streak.current).toBe(1);
  });

  it("first ever: sets current to 1", () => {
    const data = makeData();
    updateStreak(data);
    expect(data.streak.current).toBe(1);
    expect(data.streak.lastDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it("updates longest when current exceeds it", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const data = makeData({
      streak: { current: 5, longest: 5, lastDate: yesterday, freezeAvailable: true },
    });
    updateStreak(data);
    expect(data.streak.current).toBe(6);
    expect(data.streak.longest).toBe(6);
  });

  it("does not update longest when current is below", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const data = makeData({
      streak: { current: 3, longest: 10, lastDate: twoDaysAgo, freezeAvailable: true },
    });
    updateStreak(data);
    expect(data.streak.current).toBe(1);
    expect(data.streak.longest).toBe(10);
  });
});

// --- addXP ---

describe("addXP", () => {
  it("adds default 10 XP", () => {
    const today = new Date().toISOString().slice(0, 10);
    const data = makeData({
      streak: { current: 1, longest: 1, lastDate: today, freezeAvailable: true },
    });
    addXP(data);
    expect(data.xp.total).toBe(10);
    expect(data.xp.today).toBe(10);
  });

  it("adds custom XP amount", () => {
    const today = new Date().toISOString().slice(0, 10);
    const data = makeData({
      streak: { current: 1, longest: 1, lastDate: today, freezeAvailable: true },
    });
    addXP(data, 15);
    expect(data.xp.total).toBe(15);
    expect(data.xp.today).toBe(15);
  });

  it("resets today XP if lastDate is different from today", () => {
    const data = makeData({
      streak: { current: 1, longest: 1, lastDate: "2026-01-01", freezeAvailable: true },
      xp: { total: 100, today: 50 },
    });
    addXP(data);
    expect(data.xp.today).toBe(10);
    expect(data.xp.total).toBe(110);
  });

  it("accumulates today XP on same day", () => {
    const today = new Date().toISOString().slice(0, 10);
    const data = makeData({
      streak: { current: 1, longest: 1, lastDate: today, freezeAvailable: true },
      xp: { total: 100, today: 30 },
    });
    addXP(data);
    expect(data.xp.today).toBe(40);
    expect(data.xp.total).toBe(110);
  });
});

// --- markRootSeen ---

describe("markRootSeen", () => {
  it("creates new entry when root not in progress", () => {
    const data = makeData();
    markRootSeen(data, "bene-");
    expect(data.rootProgress["bene-"]).toEqual({
      seen: true,
      wordsStudied: 0,
      lastStudied: null,
    });
  });

  it("sets seen=true on existing entry without overwriting other fields", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: false, wordsStudied: 3, lastStudied: "2026-04-01" },
      },
    });
    markRootSeen(data, "bene-");
    expect(data.rootProgress["bene-"]!.seen).toBe(true);
    expect(data.rootProgress["bene-"]!.wordsStudied).toBe(3);
    expect(data.rootProgress["bene-"]!.lastStudied).toBe("2026-04-01");
  });
});

// --- markWordStudied ---

describe("markWordStudied", () => {
  it("adds word to wordsStudied array and increments root counter", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 0, lastStudied: null },
      },
    });
    markWordStudied(data, "bene-", "benefit");
    expect(data.wordsStudied).toContain("benefit");
    expect(data.rootProgress["bene-"]!.wordsStudied).toBe(1);
    expect(data.rootProgress["bene-"]!.lastStudied).toBe(
      new Date().toISOString().slice(0, 10)
    );
  });

  it("does not duplicate word in wordsStudied array", () => {
    const data = makeData({
      wordsStudied: ["benefit"],
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 1, lastStudied: "2026-04-01" },
      },
    });
    markWordStudied(data, "bene-", "benefit");
    const arr = data.wordsStudied as string[];
    expect(arr.filter((w) => w === "benefit").length).toBe(1);
  });

  it("still increments wordsStudied counter on re-study (known V1 behavior)", () => {
    const data = makeData({
      wordsStudied: ["benefit"],
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 1, lastStudied: "2026-04-01" },
      },
    });
    markWordStudied(data, "bene-", "benefit");
    // Counter increments even for duplicate word (eng review #7: leave as-is)
    expect(data.rootProgress["bene-"]!.wordsStudied).toBe(2);
  });

  it("does nothing to rootProgress if root key not present", () => {
    const data = makeData();
    markWordStudied(data, "missing-", "word");
    expect(data.wordsStudied).toContain("word");
    expect(data.rootProgress["missing-"]).toBeUndefined();
  });
});

// --- selectNextMorphemes ---

describe("selectNextMorphemes", () => {
  const roots = [makeRoot("bene-"), makeRoot("mal-"), makeRoot("pre-"), makeRoot("post-")];

  it("picks unseen roots first in order", () => {
    const data = makeData();
    const selected = selectNextMorphemes(data, roots, 2);
    expect(selected.map((r) => r.root)).toEqual(["bene-", "mal-"]);
  });

  it("respects count parameter", () => {
    const data = makeData();
    const selected = selectNextMorphemes(data, roots, 1);
    expect(selected).toHaveLength(1);
    expect(selected[0]!.root).toBe("bene-");
  });

  it("defaults to count=3", () => {
    const data = makeData();
    const selected = selectNextMorphemes(data, roots);
    expect(selected).toHaveLength(3);
  });

  it("when all seen, picks least studied first", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
        "mal-": { seen: true, wordsStudied: 2, lastStudied: "2026-04-01" },
        "pre-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-01" },
        "post-": { seen: true, wordsStudied: 1, lastStudied: "2026-04-01" },
      },
    });
    const selected = selectNextMorphemes(data, roots, 2);
    expect(selected.map((r) => r.root)).toEqual(["post-", "mal-"]);
  });

  it("tie-breaks by oldest lastStudied", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-02" },
        "mal-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-01" },
        "pre-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-03" },
        "post-": { seen: true, wordsStudied: 3, lastStudied: "2026-03-30" },
      },
    });
    const selected = selectNextMorphemes(data, roots, 2);
    expect(selected.map((r) => r.root)).toEqual(["post-", "mal-"]);
  });

  it("skips already-seen roots when unseen exist", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
        "mal-": { seen: true, wordsStudied: 2, lastStudied: "2026-04-01" },
      },
    });
    const selected = selectNextMorphemes(data, roots, 2);
    expect(selected.map((r) => r.root)).toEqual(["pre-", "post-"]);
  });
});

// --- generateStatsSummary ---

describe("generateStatsSummary", () => {
  it("produces correct markdown with array wordsStudied", () => {
    const data = makeData({
      streak: { current: 3, longest: 7, lastDate: "2026-04-01", freezeAvailable: true },
      xp: { total: 150, today: 30 },
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
        "mal-": { seen: true, wordsStudied: 2, lastStudied: "2026-04-01" },
      },
      wordsStudied: ["benefit", "benevolent", "malice"],
    });
    const summary = generateStatsSummary(data, 30);
    expect(summary).toContain("1/30 个词根");
    expect(summary).toContain("2/30 个词根");
    expect(summary).toContain("150 XP");
    expect(summary).toContain("3 天");
    expect(summary).toContain("7 天");
    expect(summary).toContain("3 个");
  });

  it("handles empty data", () => {
    const data = makeData();
    const summary = generateStatsSummary(data, 30);
    expect(summary).toContain("0/30 个词根");
    expect(summary).toContain("0 XP");
    expect(summary).toContain("0 天");
    expect(summary).toContain("0 个");
  });
});

// --- recordQuizResult ---

describe("recordQuizResult", () => {
  it("creates quizAccuracy on first correct answer", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
      },
    });
    recordQuizResult(data, "bene-", true);
    expect(data.rootProgress["bene-"]!.quizAccuracy).toEqual({
      correct: 1,
      total: 1,
    });
  });

  it("creates quizAccuracy on first wrong answer", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
      },
    });
    recordQuizResult(data, "bene-", false);
    expect(data.rootProgress["bene-"]!.quizAccuracy).toEqual({
      correct: 0,
      total: 1,
    });
  });

  it("accumulates quiz results", () => {
    const data = makeData({
      rootProgress: {
        "bene-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 3, total: 4 },
        },
      },
    });
    recordQuizResult(data, "bene-", true);
    expect(data.rootProgress["bene-"]!.quizAccuracy).toEqual({
      correct: 4,
      total: 5,
    });
    recordQuizResult(data, "bene-", false);
    expect(data.rootProgress["bene-"]!.quizAccuracy).toEqual({
      correct: 4,
      total: 6,
    });
  });

  it("does nothing if root not in progress", () => {
    const data = makeData();
    recordQuizResult(data, "missing-", true);
    expect(data.rootProgress["missing-"]).toBeUndefined();
  });
});

// --- needsReview ---

describe("needsReview", () => {
  it("returns false for unseen root", () => {
    const data = makeData();
    expect(needsReview(data, "bene-")).toBe(false);
  });

  it("returns true for seen root with < 5 wordsStudied", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-01" },
      },
    });
    expect(needsReview(data, "bene-")).toBe(true);
  });

  it("returns true for fully studied root with no quizAccuracy", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
      },
    });
    expect(needsReview(data, "bene-")).toBe(true);
  });

  it("returns true for root with quiz accuracy < 80%", () => {
    const data = makeData({
      rootProgress: {
        "bene-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 3, total: 5 },
        },
      },
    });
    expect(needsReview(data, "bene-")).toBe(true);
  });

  it("returns false for root with quiz accuracy >= 80%", () => {
    const data = makeData({
      rootProgress: {
        "bene-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 4, total: 5 },
        },
      },
    });
    expect(needsReview(data, "bene-")).toBe(false);
  });

  it("returns false for root with 100% quiz accuracy", () => {
    const data = makeData({
      rootProgress: {
        "bene-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 5, total: 5 },
        },
      },
    });
    expect(needsReview(data, "bene-")).toBe(false);
  });
});

// --- selectReviewMorphemes ---

describe("selectReviewMorphemes", () => {
  const roots = [makeRoot("bene-"), makeRoot("mal-"), makeRoot("pre-"), makeRoot("post-")];

  it("returns empty when no roots need review", () => {
    const data = makeData({
      rootProgress: {
        "bene-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 5, total: 5 },
        },
        "mal-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 4, total: 5 },
        },
      },
    });
    expect(selectReviewMorphemes(data, roots)).toEqual([]);
  });

  it("selects roots with no quizAccuracy over those with good accuracy", () => {
    const data = makeData({
      rootProgress: {
        "bene-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 5, total: 5 },
        },
        "mal-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
        "pre-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 4, total: 5 },
        },
      },
    });
    const selected = selectReviewMorphemes(data, roots, 2);
    expect(selected.map((r) => r.root)).toContain("mal-");
  });

  it("prioritizes lowest accuracy roots", () => {
    const data = makeData({
      rootProgress: {
        "bene-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 3, total: 5 },
        },
        "mal-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 1, total: 5 },
        },
        "pre-": {
          seen: true,
          wordsStudied: 5,
          lastStudied: "2026-04-01",
          quizAccuracy: { correct: 2, total: 5 },
        },
      },
    });
    const selected = selectReviewMorphemes(data, roots, 2);
    expect(selected[0]!.root).toBe("mal-");
    expect(selected[1]!.root).toBe("pre-");
  });

  it("includes roots with < 5 wordsStudied", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 2, lastStudied: "2026-04-01" },
      },
    });
    const selected = selectReviewMorphemes(data, roots, 3);
    expect(selected.map((r) => r.root)).toContain("bene-");
  });

  it("does not include unseen roots", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: false, wordsStudied: 0, lastStudied: null },
      },
    });
    expect(selectReviewMorphemes(data, roots)).toEqual([]);
  });
});
