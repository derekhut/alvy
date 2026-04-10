import type { RootEntry, Subject, Command } from "./types.js";
import type { SubjectDB } from "./subject-db.js";
import { createSubjectDB } from "./subject-db.js";
import type { RootLessonLabels } from "../components/root-lesson.js";

import roots from "../data/roots.json" with { type: "json" };
import psychData from "../data/psych.json" with { type: "json" };
import cspData from "../data/csp.json" with { type: "json" };
import whapData from "../data/whap.json" with { type: "json" };
import microData from "../data/micro.json" with { type: "json" };
import macroData from "../data/macro.json" with { type: "json" };

export interface SubjectConfig {
  /** Subject identifier (also the key into SUBJECTS) */
  id: Subject;

  // ── Identity / display ──
  pickerLabel: string;       // Subject picker row
  dashboardTitle: string;    // Dashboard "alvy <title>" header
  reviewIntroTitle: string;  // Review intro card title (e.g. "复习模式" or "复习模式 — AP 心理学")
  emptyHintCmd: string;      // CLI command shown in empty-state hint (e.g. "alvy psych" or "alvy")

  // ── Vocabulary ──
  unitNoun: string;          // "词根" or "概念"
  wordNoun: string;          // "单词" or "术语"
  emptyNoun: string;         // Used in empty-state: "还没有可以复习的<emptyNoun>"

  // ── Component knobs ──
  rootLessonLabels?: RootLessonLabels;
  wordDetailDerivationLabel?: string;
  hideFrequency?: boolean;
  quizTitle?: string;

  // ── Review-list rendering ──
  /** Strips trailing context from meaning_zh in the review intro list */
  reviewMeaningSummary: (entry: RootEntry) => string;

  // ── CLI ──
  /** Subcommand token: "" for TOEFL (uses bare daily/review), else the cliToken */
  cliToken: string;
  sessionCommand: Command;
  reviewCommand: Command;

  // ── Data ──
  db: SubjectDB;
}

const apRootLessonLabels: RootLessonLabels = {
  unitLabel: "概念",
  wordListIntro: "这个概念的核心术语:",
};

const apWordDetailKnobs = {
  hideFrequency: true,
  wordDetailDerivationLabel: "概念拆解:",
  quizTitle: "概念测验",
} as const;

/** Default review-list rendering: full meaning_zh (used by TOEFL). */
const fullMeaning = (e: RootEntry): string => e.meaning_zh;
/** AP review-list rendering: strip everything after the colon. */
const beforeColon = (e: RootEntry): string => e.meaning_zh.split("：")[0]!;

export const SUBJECTS: Record<Subject, SubjectConfig> = {
  toefl: {
    id: "toefl",
    pickerLabel: "TOEFL 词根",
    dashboardTitle: "词根学习",
    reviewIntroTitle: "复习模式",
    emptyHintCmd: "alvy",
    unitNoun: "词根",
    wordNoun: "单词",
    emptyNoun: "词根",
    reviewMeaningSummary: fullMeaning,
    cliToken: "",
    sessionCommand: "daily",
    reviewCommand: "review",
    db: createSubjectDB(roots as RootEntry[]),
  },
  psych: {
    id: "psych",
    pickerLabel: "AP 心理学",
    dashboardTitle: "AP 心理学",
    reviewIntroTitle: "复习模式 — AP 心理学",
    emptyHintCmd: "alvy psych",
    unitNoun: "概念",
    wordNoun: "术语",
    emptyNoun: "概念",
    rootLessonLabels: apRootLessonLabels,
    ...apWordDetailKnobs,
    reviewMeaningSummary: beforeColon,
    cliToken: "psych",
    sessionCommand: "psych",
    reviewCommand: "psych-review",
    db: createSubjectDB(psychData as RootEntry[]),
  },
  csp: {
    id: "csp",
    pickerLabel: "AP 计算机科学原理",
    dashboardTitle: "AP 计算机科学原理",
    reviewIntroTitle: "复习模式 — AP 计算机科学原理",
    emptyHintCmd: "alvy csp",
    unitNoun: "概念",
    wordNoun: "术语",
    emptyNoun: "概念",
    rootLessonLabels: apRootLessonLabels,
    ...apWordDetailKnobs,
    reviewMeaningSummary: beforeColon,
    cliToken: "csp",
    sessionCommand: "csp",
    reviewCommand: "csp-review",
    db: createSubjectDB(cspData as RootEntry[]),
  },
  whap: {
    id: "whap",
    pickerLabel: "AP 世界历史",
    dashboardTitle: "AP 世界历史",
    reviewIntroTitle: "复习模式 — AP 世界历史",
    emptyHintCmd: "alvy whap",
    unitNoun: "概念",
    wordNoun: "术语",
    emptyNoun: "概念",
    rootLessonLabels: apRootLessonLabels,
    ...apWordDetailKnobs,
    reviewMeaningSummary: beforeColon,
    cliToken: "whap",
    sessionCommand: "whap",
    reviewCommand: "whap-review",
    db: createSubjectDB(whapData as RootEntry[]),
  },
  micro: {
    id: "micro",
    pickerLabel: "AP 微观经济学",
    dashboardTitle: "AP 微观经济学",
    reviewIntroTitle: "复习模式 — AP 微观经济学",
    emptyHintCmd: "alvy micro",
    unitNoun: "概念",
    wordNoun: "术语",
    emptyNoun: "概念",
    rootLessonLabels: apRootLessonLabels,
    ...apWordDetailKnobs,
    reviewMeaningSummary: beforeColon,
    cliToken: "micro",
    sessionCommand: "micro",
    reviewCommand: "micro-review",
    db: createSubjectDB(microData as RootEntry[]),
  },
  macro: {
    id: "macro",
    pickerLabel: "AP 宏观经济学",
    dashboardTitle: "AP 宏观经济学",
    reviewIntroTitle: "复习模式 — AP 宏观经济学",
    emptyHintCmd: "alvy macro",
    unitNoun: "概念",
    wordNoun: "术语",
    emptyNoun: "概念",
    rootLessonLabels: apRootLessonLabels,
    ...apWordDetailKnobs,
    reviewMeaningSummary: beforeColon,
    cliToken: "macro",
    sessionCommand: "macro",
    reviewCommand: "macro-review",
    db: createSubjectDB(macroData as RootEntry[]),
  },
};

/** Display order for picker, stats, etc. */
export const SUBJECT_LIST: SubjectConfig[] = [
  SUBJECTS.toefl,
  SUBJECTS.psych,
  SUBJECTS.csp,
  SUBJECTS.whap,
  SUBJECTS.micro,
  SUBJECTS.macro,
];

/** Map a Subject id to the Command its session uses. */
export const SUBJECT_TO_SESSION_COMMAND: Record<Subject, Command> = {
  toefl: "daily",
  psych: "psych",
  csp: "csp",
  whap: "whap",
  micro: "micro",
  macro: "macro",
};
