import type { RootEntry, RootWord } from "./types.js";
import whapData from "../data/whap.json" with { type: "json" };

const topics: RootEntry[] = whapData as RootEntry[];

/** Get all topic entries */
export function getAllTopics(): RootEntry[] {
  return topics;
}

/** Get total number of topic entries */
export function getTopicCount(): number {
  return topics.length;
}

/** Get a topic entry by its key */
export function getTopicByKey(key: string): RootEntry | undefined {
  return topics.find((t) => t.root === key);
}

/** Get meanings map for related topics */
export function getRelatedMeanings(entry: RootEntry): Record<string, string> {
  const result: Record<string, string> = {};
  for (const relatedKey of entry.related) {
    const related = getTopicByKey(relatedKey);
    if (related) {
      result[relatedKey] = related.meaning_zh;
    }
  }
  return result;
}

/** Get a distractor meaning_zh for quiz questions */
export function getDistractorMeaning(word: RootWord, currentEntry: RootEntry): string {
  const otherWords: RootWord[] = [];

  // First try words from other topics
  for (const topic of topics) {
    if (topic.root === currentEntry.root) continue;
    for (const w of topic.words) {
      if (w.meaning_zh !== word.meaning_zh) {
        otherWords.push(w);
      }
    }
  }

  // Fallback: other words in the same topic
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
