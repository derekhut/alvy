import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { UserData } from "./types.js";

const DATA_DIR = path.join(os.homedir(), ".toefl-roots");
const DATA_FILE = path.join(DATA_DIR, "data.json");
const BACKUP_FILE = path.join(DATA_DIR, "data.backup.json");

interface PersistedData {
  streak: { current: number; longest: number; lastDate: string | null };
  xp: { total: number; today: number };
  dailyGoal: number;
  rootProgress: Record<string, { seen: boolean; wordsStudied: number; lastStudied: string | null }>;
  wordsStudied: string[];
}

function defaultData(): UserData {
  return {
    streak: { current: 0, longest: 0, lastDate: null },
    xp: { total: 0, today: 0 },
    dailyGoal: 3,
    rootProgress: {},
    wordsStudied: [],
  };
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadData(): UserData {
  ensureDir();

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

    return {
      ...parsed,
      wordsStudied: parsed.wordsStudied ?? [],
    };
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
    streak: data.streak,
    xp: data.xp,
    dailyGoal: data.dailyGoal,
    rootProgress: data.rootProgress,
    wordsStudied: Array.isArray(data.wordsStudied)
      ? data.wordsStudied
      : [...data.wordsStudied],
  };
  const json = JSON.stringify(persisted, null, 2);
  const tmpFile = DATA_FILE + ".tmp";
  fs.writeFileSync(tmpFile, json, "utf-8");
  fs.renameSync(tmpFile, DATA_FILE);
}

export function getDataPath(): string {
  return DATA_FILE;
}
