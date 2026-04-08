import type { RootEntry, RootWord } from "./types.js";
import psychData from "../data/psych.json" with { type: "json" };

const concepts: RootEntry[] = psychData as RootEntry[];

/** Get all concept entries */
export function getAllConcepts(): RootEntry[] {
  return concepts;
}

/** Get total number of concept entries */
export function getConceptCount(): number {
  return concepts.length;
}

/** Get a concept entry by its key */
export function getConceptByKey(key: string): RootEntry | undefined {
  return concepts.find((c) => c.root === key);
}

/** Get meanings map for related concepts */
export function getRelatedMeanings(entry: RootEntry): Record<string, string> {
  const result: Record<string, string> = {};
  for (const relatedKey of entry.related) {
    const related = getConceptByKey(relatedKey);
    if (related) {
      result[relatedKey] = related.meaning_zh;
    }
  }
  return result;
}

/** Get a distractor meaning_zh for quiz questions */
export function getDistractorMeaning(word: RootWord, currentEntry: RootEntry): string {
  const otherWords: RootWord[] = [];

  // First try words from other concepts
  for (const concept of concepts) {
    if (concept.root === currentEntry.root) continue;
    for (const w of concept.words) {
      if (w.meaning_zh !== word.meaning_zh) {
        otherWords.push(w);
      }
    }
  }

  // Fallback: other words in the same concept
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
}
