// Root/affix entry in roots.json
export interface RootWord {
  word: string;
  breakdown: string;
  derivation: string; // 新东方 style chain: "bene(好的) + fit(做) → 做好事 → 益处"
  meaning_en: string;
  meaning_zh: string;
  example: string;
  example_zh: string;
  toefl_frequency: "high" | "medium" | "low";
}

export interface RootEntry {
  root: string;
  type: "root" | "prefix" | "suffix";
  meaning_en: string;
  meaning_zh: string;
  origin: string;
  related: string[];
  words: RootWord[];
}

// User progress stored at ~/.toefl-roots/data.json
export interface RootProgress {
  seen: boolean;
  wordsStudied: number;
  lastStudied: string | null;
}

export interface UserData {
  streak: {
    current: number;
    longest: number;
    lastDate: string | null;
  };
  xp: {
    total: number;
    today: number;
  };
  dailyGoal: number;
  rootProgress: Record<string, RootProgress>;
  wordsStudied: Set<string> | string[]; // persisted as array
}

export type Command = "daily" | "review" | "stats" | "doctor";
