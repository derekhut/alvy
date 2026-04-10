import { describe, it, expect } from "vitest";
import { createSubjectDB } from "../subject-db.js";
import type { RootEntry, RootWord } from "../types.js";

function makeWord(word: string, meaning_zh: string): RootWord {
  return {
    word,
    breakdown: word,
    derivation: "",
    meaning_en: word,
    meaning_zh,
    example: "",
    example_zh: "",
    toefl_frequency: "high",
  };
}

function makeEntry(root: string, related: string[], wordCount = 3): RootEntry {
  return {
    root,
    type: "root",
    meaning_en: root,
    meaning_zh: `${root}的中文`,
    origin: "test",
    related,
    words: Array.from({ length: wordCount }, (_, i) =>
      makeWord(`${root}-w${i}`, `${root}-意思${i}`),
    ),
  };
}

describe("createSubjectDB", () => {
  it("round-trips: getAll/getCount/getByKey return the input", () => {
    const data: RootEntry[] = [
      makeEntry("alpha", []),
      makeEntry("beta", []),
      makeEntry("gamma", []),
    ];
    const db = createSubjectDB(data);
    expect(db.getAll()).toBe(data);
    expect(db.getCount()).toBe(3);
    expect(db.getByKey("beta")?.root).toBe("beta");
    expect(db.getByKey("missing")).toBeUndefined();
  });

  it("getRelatedMeanings only includes existing keys", () => {
    const data: RootEntry[] = [
      makeEntry("alpha", ["beta", "ghost"]),
      makeEntry("beta", []),
    ];
    const db = createSubjectDB(data);
    const related = db.getRelatedMeanings(data[0]!);
    expect(Object.keys(related)).toEqual(["beta"]);
    expect(related["beta"]).toBe("beta的中文");
    expect(related["ghost"]).toBeUndefined();
  });

  it("getDistractorMeaning never returns the same meaning", () => {
    const data: RootEntry[] = [
      makeEntry("alpha", [], 3),
      makeEntry("beta", [], 3),
    ];
    const db = createSubjectDB(data);
    const targetWord = data[0]!.words[0]!;
    for (let i = 0; i < 50; i++) {
      const distractor = db.getDistractorMeaning(targetWord, data[0]!);
      expect(distractor).not.toBe(targetWord.meaning_zh);
    }
  });

  it("getDistractorMeaning returns 未知 when nothing else exists", () => {
    const sameMeaning = "唯一意思";
    const data: RootEntry[] = [
      {
        root: "lonely",
        type: "root",
        meaning_en: "lonely",
        meaning_zh: "孤独",
        origin: "",
        related: [],
        words: [
          makeWord("only-w0", sameMeaning),
          makeWord("only-w1", sameMeaning),
        ],
      },
    ];
    const db = createSubjectDB(data);
    expect(db.getDistractorMeaning(data[0]!.words[0]!, data[0]!)).toBe("未知");
  });
});
