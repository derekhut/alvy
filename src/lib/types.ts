// Root/affix entry in roots.json
export interface RootWord {
  word: string;
  phonetic?: string; // IPA notation
  breakdown: string;
  derivation: string; // 新东方 style chain: "bene(好的) + fit(做) → 做好事 → 益处"
  mnemonic?: string; // 联想记忆
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

// User progress stored at ~/.alvy/data.json
export interface RootProgress {
  seen: boolean;
  wordsStudied: number;
  lastStudied: string | null;
  quizAccuracy?: {
    correct: number;
    total: number;
  };
}

export interface UserData {
  version: number;
  streak: {
    current: number;
    longest: number;
    lastDate: string | null;
    freezeAvailable: boolean;
    freezeUsedDate?: string;
  };
  xp: {
    total: number;
    today: number;
  };
  dailyGoal: number;
  rootProgress: Record<string, RootProgress>;
  wordsStudied: string[];
  settings?: {
    sound: boolean;
    dailyGoal: number;
    lastSubject?: Subject;
  };
}

export type Subject = "toefl" | "psych" | "csp";

export type Command = "daily" | "review" | "stats" | "doctor" | "psych" | "psych-review" | "csp" | "csp-review" | "pick";
