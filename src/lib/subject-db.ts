import type { RootEntry, RootWord } from "./types.js";

export interface SubjectDB {
  getAll: () => RootEntry[];
  getCount: () => number;
  getByKey: (key: string) => RootEntry | undefined;
  getRelatedMeanings: (entry: RootEntry) => Record<string, string>;
  getDistractorMeaning: (word: RootWord, currentEntry: RootEntry) => string;
}

/** Build a SubjectDB from a parsed JSON array of RootEntry. */
export function createSubjectDB(data: RootEntry[]): SubjectDB {
  const entries: RootEntry[] = data;

  const getAll = () => entries;
  const getCount = () => entries.length;
  const getByKey = (key: string) => entries.find((e) => e.root === key);

  const getRelatedMeanings = (entry: RootEntry): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const relatedKey of entry.related) {
      const related = getByKey(relatedKey);
      if (related) {
        result[relatedKey] = related.meaning_zh;
      }
    }
    return result;
  };

  const getDistractorMeaning = (word: RootWord, currentEntry: RootEntry): string => {
    const otherWords: RootWord[] = [];

    // First try words from other entries
    for (const e of entries) {
      if (e.root === currentEntry.root) continue;
      for (const w of e.words) {
        if (w.meaning_zh !== word.meaning_zh) {
          otherWords.push(w);
        }
      }
    }

    // Fallback: other words in the same entry
    if (otherWords.length === 0) {
      for (const w of currentEntry.words) {
        if (w.word !== word.word && w.meaning_zh !== word.meaning_zh) {
          otherWords.push(w);
        }
      }
    }

    if (otherWords.length > 0) {
      return otherWords[Math.floor(Math.random() * otherWords.length)]!.meaning_zh;
    }
    return "未知";
  };

  return { getAll, getCount, getByKey, getRelatedMeanings, getDistractorMeaning };
}
