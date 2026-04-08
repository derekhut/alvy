import type { RootEntry, RootWord } from "./types.js";
import rootsData from "../data/roots.json" with { type: "json" };

const roots: RootEntry[] = rootsData as RootEntry[];

/** Get all root entries */
export function getAllRoots(): RootEntry[] {
  return roots;
}

/** Get total number of root entries */
export function getRootCount(): number {
  return roots.length;
}

/** Get a root entry by its key (e.g., "bene-") */
export function getRootByKey(key: string): RootEntry | undefined {
  return roots.find((r) => r.root === key);
}

/** Get meanings map for related roots */
export function getRelatedMeanings(entry: RootEntry): Record<string, string> {
  const result: Record<string, string> = {};
  for (const relatedKey of entry.related) {
    const related = getRootByKey(relatedKey);
    if (related) {
      result[relatedKey] = related.meaning_zh;
    }
  }
  return result;
}

/** Get a distractor meaning_zh for quiz questions */
export function getDistractorMeaning(word: RootWord, currentEntry: RootEntry): string {
  const otherWords: RootWord[] = [];

  // First try words from other roots
  for (const root of roots) {
    if (root.root === currentEntry.root) continue;
    for (const w of root.words) {
      if (w.meaning_zh !== word.meaning_zh) {
        otherWords.push(w);
      }
    }
  }

  // Fallback: other words in the same root
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
  return "未知"; // extreme fallback
}
