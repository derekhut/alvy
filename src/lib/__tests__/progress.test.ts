import { describe, it, expect } from "vitest";
import type { UserData, RootEntry } from "../types.js";
import {
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
    // lastStudied is a full ISO timestamp starting with today's date,
    // so same-day concepts can be ordered by recency.
    const today = new Date().toISOString().slice(0, 10);
    expect(data.rootProgress["bene-"]!.lastStudied).toMatch(
      new RegExp(`^${today}T`)
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

  it("does not increment wordsStudied counter on re-study", () => {
    const data = makeData({
      wordsStudied: ["benefit"],
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 1, lastStudied: "2026-04-01" },
      },
    });
    markWordStudied(data, "bene-", "benefit");
    // Counter only increments for new words (fixed in eng review #9)
    expect(data.rootProgress["bene-"]!.wordsStudied).toBe(1);
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

  it("picks roots in order for fresh user (empty progress)", () => {
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

  it("sorts by oldest lastStudied first", () => {
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

  it("treats never-studied (null/missing) as oldest", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-02" },
        "mal-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-01" },
      },
    });
    // pre- and post- have no progress → empty string sorts before any date
    const selected = selectNextMorphemes(data, roots, 2);
    expect(selected.map((r) => r.root)).toEqual(["pre-", "post-"]);
  });

  it("does not skip mastered roots (all-seen behavior: pure rotation)", () => {
    // Previously mastered short concepts would be skipped. Now the concept
    // of "mastered" is removed — roots rotate by lastStudied only.
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
        "mal-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-02" },
        "pre-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-03" },
        "post-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-04" },
      },
    });
    const selected = selectNextMorphemes(data, roots, 2);
    expect(selected.map((r) => r.root)).toEqual(["bene-", "mal-"]);
  });
});

// --- selectNextMorphemes rotation (regression) ---

describe("selectNextMorphemes rotation", () => {
  it("rotates through all concepts across multiple batches", () => {
    // Regression test for CSP session rotation bug: if lastStudied updates
    // are persisted correctly between batches, selectNextMorphemes should
    // eventually cover every concept rather than getting stuck on the first
    // few in JSON order.
    const roots = Array.from({ length: 10 }, (_, i) => makeRoot(`r${i}`, 1));
    const data = makeData();
    const seen = new Set<string>();

    // Simulate 4 batches of 3 — 12 picks should cover all 10 concepts.
    for (let batch = 0; batch < 4; batch++) {
      const picks = selectNextMorphemes(data, roots, 3);
      for (let i = 0; i < picks.length; i++) {
        const pick = picks[i]!;
        seen.add(pick.root);
        // Simulate markWordStudied writing a unique, monotonically
        // increasing ISO timestamp so sorts produce a stable order.
        data.rootProgress[pick.root] = {
          seen: true,
          wordsStudied: 1,
          lastStudied: new Date(
            Date.parse("2026-01-01") + batch * 10000 + i
          ).toISOString(),
        };
      }
    }
    expect(seen.size).toBe(10);
  });
});

// --- generateStatsSummary ---

describe("generateStatsSummary", () => {
  it("produces correct markdown with array wordsStudied", () => {
    const roots = [makeRoot("bene-", 5), makeRoot("mal-", 5)];
    const data = makeData({
      streak: { current: 3, longest: 7, lastDate: "2026-04-01", freezeAvailable: true },
      xp: { total: 150, today: 30 },
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
        "mal-": { seen: true, wordsStudied: 2, lastStudied: "2026-04-01" },
      },
      wordsStudied: ["benefit", "benevolent", "malice"],
    });
    const summary = generateStatsSummary(data, 30, roots);
    expect(summary).toContain("150 XP");
    expect(summary).toContain("3 天");
    expect(summary).toContain("7 天");
    expect(summary).toContain("3 个");
    expect(summary).not.toContain("已掌握");
    expect(summary).not.toContain("已学习");
  });

  it("handles empty data", () => {
    const data = makeData();
    const summary = generateStatsSummary(data, 30);
    expect(summary).toContain("0 XP");
    expect(summary).toContain("0 天");
    expect(summary).toContain("0 个");
    expect(summary).not.toContain("已掌握");
    expect(summary).not.toContain("已学习");
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

  it("returns true for seen root with incomplete words studied", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-01" },
      },
    });
    expect(needsReview(data, "bene-", 5)).toBe(true);
  });

  it("returns true when wordsStudied matches a smaller totalWords but not the given one", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 3, lastStudied: "2026-04-01" },
      },
    });
    // 3 words studied, root has 3 words — fully studied, but no quiz yet
    expect(needsReview(data, "bene-", 3)).toBe(true);
  });

  it("returns true for fully studied root with no quizAccuracy", () => {
    const data = makeData({
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
      },
    });
    expect(needsReview(data, "bene-", 5)).toBe(true);
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

  it("includes roots with incomplete wordsStudied", () => {
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
