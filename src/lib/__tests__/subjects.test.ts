import { describe, it, expect } from "vitest";
import { SUBJECTS, SUBJECT_LIST, SUBJECT_IDS } from "../subjects.js";

describe("SUBJECT_LIST", () => {
  it("contains 6 subjects in display order", () => {
    expect(SUBJECT_LIST).toHaveLength(6);
    expect(SUBJECT_LIST.map((s) => s.id)).toEqual([
      "toefl",
      "psych",
      "csp",
      "whap",
      "micro",
      "macro",
    ]);
  });
});

describe("SUBJECTS map", () => {
  it("each entry's id matches its key", () => {
    for (const [key, cfg] of Object.entries(SUBJECTS)) {
      expect(cfg.id).toBe(key);
    }
  });

  it("every subject's db has at least one entry", () => {
    for (const cfg of SUBJECT_LIST) {
      expect(cfg.db.getCount()).toBeGreaterThan(0);
    }
  });

  it("non-empty cliTokens are unique", () => {
    const tokens = SUBJECT_LIST.map((s) => s.cliToken).filter((t) => t.length > 0);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it("session/review commands are unique across all subjects", () => {
    const cmds = SUBJECT_LIST.flatMap((s) => [s.sessionCommand, s.reviewCommand]);
    expect(new Set(cmds).size).toBe(cmds.length);
  });

  it("reviewMeaningSummary truncates AP entries at 'colon' but TOEFL keeps full", () => {
    const apEntry = {
      root: "x",
      type: "root" as const,
      meaning_en: "x",
      meaning_zh: "认知失调：当持有矛盾信念时的心理不适",
      origin: "",
      related: [],
      words: [],
    };
    expect(SUBJECTS.psych.reviewMeaningSummary(apEntry)).toBe("认知失调");
    expect(SUBJECTS.psych.reviewMeaningSummary(apEntry)).not.toBe(apEntry.meaning_zh);

    const toeflEntry = {
      root: "bene-",
      type: "root" as const,
      meaning_en: "good",
      meaning_zh: "好的",
      origin: "",
      related: [],
      words: [],
    };
    expect(SUBJECTS.toefl.reviewMeaningSummary(toeflEntry)).toBe("好的");
  });
});

describe("SUBJECT_IDS", () => {
  it("matches SUBJECT_LIST ordering exactly", () => {
    expect(SUBJECT_IDS).toEqual(SUBJECT_LIST.map((s) => s.id));
  });

  it("every id has a corresponding config in SUBJECTS", () => {
    for (const id of SUBJECT_IDS) {
      expect(SUBJECTS[id]).toBeTruthy();
      expect(SUBJECTS[id].id).toBe(id);
    }
  });
});
