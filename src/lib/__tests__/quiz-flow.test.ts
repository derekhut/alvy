import { describe, it, expect } from "vitest";
import { generateQuizQuestions } from "../../hooks/useQuizFlow.js";
import { createSubjectDB } from "../subject-db.js";
import type { RootEntry } from "../types.js";

const mockEntries: RootEntry[] = [
  {
    root: "Root A",
    type: "root",
    meaning_en: "meaning A",
    meaning_zh: "含义A",
    origin: "Unit 1: 1.1 Topic A",
    related: [],
    words: [
      { word: "word1", breakdown: "w-1", meaning_en: "en1", meaning_zh: "中1", derivation: "d1", example: "ex1", example_zh: "例1", toefl_frequency: "high" },
      { word: "word2", breakdown: "w-2", meaning_en: "en2", meaning_zh: "中2", derivation: "d2", example: "ex2", example_zh: "例2", toefl_frequency: "medium" },
    ],
  },
  {
    root: "Root B",
    type: "root",
    meaning_en: "meaning B",
    meaning_zh: "含义B",
    origin: "Unit 1: 1.2 Topic B",
    related: [],
    words: [
      { word: "word3", breakdown: "w-3", meaning_en: "en3", meaning_zh: "中3", derivation: "d3", example: "ex3", example_zh: "例3", toefl_frequency: "low" },
    ],
  },
];

describe("generateQuizQuestions", () => {
  const db = createSubjectDB(mockEntries);

  it("generates the requested number of questions (capped by available words)", () => {
    const qs = generateQuizQuestions(db, 20);
    // Only 3 words exist → should get 3 questions
    expect(qs.length).toBe(3);
  });

  it("generates exactly count questions when enough words exist", () => {
    const qs = generateQuizQuestions(db, 2);
    expect(qs.length).toBe(2);
  });

  it("each question has correct structure", () => {
    const qs = generateQuizQuestions(db, 3);
    for (const q of qs) {
      expect(q.word).toBeDefined();
      expect(q.word.word).toBeTruthy();
      expect(q.correctIdx).toBeGreaterThanOrEqual(0);
      expect(q.correctIdx).toBeLessThanOrEqual(1);
      expect(q.choices).toHaveLength(2);
      // Correct answer should be in choices
      expect(q.choices[q.correctIdx]).toBe(q.word.meaning_zh);
    }
  });

  it("returns empty array for empty DB", () => {
    const emptyDb = createSubjectDB([]);
    const qs = generateQuizQuestions(emptyDb, 20);
    expect(qs).toEqual([]);
  });
});
