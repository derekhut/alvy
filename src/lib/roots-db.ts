import type { RootEntry } from "./types.js";
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
