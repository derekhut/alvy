export type AvatarId = "duck" | "goose" | "blob" | "cat" | "dragon" | "octopus" | "owl" | "penguin" | "turtle" | "snail" | "ghost" | "axolotl" | "robot" | "cactus" | "rabbit" | "mushroom" | "bear" | "alien";

export interface UserProfile {
  displayName: string;
  avatar: AvatarId;
  createdAt: string; // ISO date
}

export interface LevelProgress {
  level: number;
  compositeScore: number;        // 0-100
  totalStudyDays: number;
  totalCorrectQuiz: number;
  totalQuizAttempts: number;
  totalWordsStudied: number;
}

export interface QuizQuestion {
  word: RootWord;
  correctIdx: number; // 0 or 1
  choices: [string, string]; // two Chinese meanings
}

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
  profile?: UserProfile;
  levelProgress: LevelProgress;
}

import type { SUBJECT_IDS } from "./subjects.js";

export type Subject = (typeof SUBJECT_IDS)[number];

// Command is the union of every subject's session/review commands,
// plus the fixed set of global commands. We derive session/review commands
// from Subject using template literal types where possible.
//
// Pattern: most subjects use `${id}` and `${id}-review` as their commands.
// TOEFL is the exception: its sessionCommand is "daily" and reviewCommand is
// "review" (so bare `alvy review` works). We encode TOEFL as a special case
// and derive the AP commands from `Exclude<Subject, "toefl">`.
type APSubject = Exclude<Subject, "toefl">;

export type Command =
  | "daily"             // TOEFL session
  | "review"            // TOEFL review (bare)
  | "test"              // TOEFL quiz (bare)
  | APSubject           // psych | csp | whap | micro | macro
  | `${APSubject}-review`
  | `${APSubject}-test`
  | "stats"
  | "doctor"
  | "profile"
  | "pick";
