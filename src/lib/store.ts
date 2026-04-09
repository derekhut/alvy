import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { UserData, UserProfile, LevelProgress, AvatarId } from "./types.js";
import { computeLevel, computeCompositeScore } from "./levels.js";
import { AVATAR_IDS } from "./avatars.js";

export const DATA_DIR = path.join(os.homedir(), ".alvy");
export const DATA_FILE = path.join(DATA_DIR, "data.json");
const BACKUP_FILE = path.join(DATA_DIR, "data.backup.json");

const OLD_DATA_DIR = path.join(os.homedir(), ".toefl-roots");
const OLD_DATA_FILE = path.join(OLD_DATA_DIR, "data.json");

interface PersistedData {
  version?: number;
  streak: {
    current: number;
    longest: number;
    lastDate: string | null;
    freezeAvailable?: boolean;
    freezeUsedDate?: string;
  };
  xp: { total: number; today: number };
  dailyGoal: number;
  rootProgress: Record<string, {
    seen: boolean;
    wordsStudied: number;
    lastStudied: string | null;
    quizAccuracy?: { correct: number; total: number };
  }>;
  wordsStudied: string[];
  settings?: { sound: boolean; dailyGoal: number; lastSubject?: "toefl" | "psych" | "csp" | "whap" | "micro" };
  profile?: UserProfile;
  levelProgress?: LevelProgress;
}

function defaultLevelProgress(): LevelProgress {
  return { level: 1, compositeScore: 0, totalStudyDays: 0, totalCorrectQuiz: 0, totalQuizAttempts: 0, totalWordsStudied: 0 };
}

function defaultData(): UserData {
  return {
    version: 3,
    streak: { current: 0, longest: 0, lastDate: null, freezeAvailable: true },
    xp: { total: 0, today: 0 },
    dailyGoal: 3,
    rootProgress: {},
    wordsStudied: [],
    settings: { sound: false, dailyGoal: 3 },
    levelProgress: defaultLevelProgress(),
  };
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrateFromOldPath(): void {
  if (!fs.existsSync(DATA_FILE) && fs.existsSync(OLD_DATA_FILE)) {
    fs.copyFileSync(OLD_DATA_FILE, DATA_FILE);
  }
}

export function loadData(): UserData {
  ensureDir();
  migrateFromOldPath();

  if (!fs.existsSync(DATA_FILE)) {
    const data = defaultData();
    saveData(data);
    return data;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as PersistedData;

    if (!parsed.streak || !parsed.xp || !parsed.rootProgress) {
      throw new Error("Invalid data structure");
    }

    // V1 → V2 → V3 field-level backfill
    const needsV2Migration = !parsed.version || parsed.version < 2;
    const needsV3Migration = !parsed.version || parsed.version < 3;
    if (needsV2Migration || needsV3Migration) {
      fs.copyFileSync(DATA_FILE, BACKUP_FILE);
    }

    // Backfill levelProgress from existing data
    let levelProgress: LevelProgress;
    if (parsed.levelProgress) {
      levelProgress = parsed.levelProgress;
    } else {
      // Compute from existing data for V2→V3
      let totalCorrect = 0;
      let totalAttempts = 0;
      for (const rp of Object.values(parsed.rootProgress)) {
        if (rp.quizAccuracy) {
          totalCorrect += rp.quizAccuracy.correct;
          totalAttempts += rp.quizAccuracy.total;
        }
      }
      levelProgress = {
        level: computeLevel(parsed.xp.total),
        compositeScore: 0,
        totalStudyDays: 0,
        totalCorrectQuiz: totalCorrect,
        totalQuizAttempts: totalAttempts,
        totalWordsStudied: (parsed.wordsStudied ?? []).length,
      };
    }

    const data: UserData = {
      version: parsed.version ?? 3,
      streak: {
        current: parsed.streak.current,
        longest: parsed.streak.longest,
        lastDate: parsed.streak.lastDate,
        freezeAvailable: parsed.streak.freezeAvailable ?? true,
        freezeUsedDate: parsed.streak.freezeUsedDate,
      },
      xp: parsed.xp,
      dailyGoal: parsed.dailyGoal,
      rootProgress: parsed.rootProgress,
      wordsStudied: parsed.wordsStudied ?? [],
      settings: parsed.settings ?? { sound: false, dailyGoal: parsed.dailyGoal ?? 3 },
      profile: parsed.profile,
      levelProgress,
    };

    // Remap old avatar IDs to defaults
    if (data.profile && !AVATAR_IDS.includes(data.profile.avatar as AvatarId)) {
      data.profile.avatar = "robot" as AvatarId;
    }

    // Compute composite score after data is assembled
    if (!parsed.levelProgress) {
      data.levelProgress.compositeScore = computeCompositeScore(data);
    }

    if (needsV2Migration || needsV3Migration) {
      data.version = 3;
      saveData(data);
    }

    return data;
  } catch {
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, BACKUP_FILE);
    }
    console.error(
      `警告: data.json 已损坏，已备份至 ${BACKUP_FILE}。重新开始。`
    );
    const data = defaultData();
    saveData(data);
    return data;
  }
}

export function saveData(data: UserData): void {
  ensureDir();
  const persisted: PersistedData = {
    version: data.version,
    streak: data.streak,
    xp: data.xp,
    dailyGoal: data.dailyGoal,
    rootProgress: data.rootProgress,
    wordsStudied: data.wordsStudied,
    settings: data.settings,
    profile: data.profile,
    levelProgress: data.levelProgress,
  };
  const json = JSON.stringify(persisted, null, 2);
  const tmpFile = DATA_FILE + ".tmp";
  fs.writeFileSync(tmpFile, json, "utf-8");
  fs.renameSync(tmpFile, DATA_FILE);
}

export function getDataPath(): string {
  return DATA_FILE;
}
