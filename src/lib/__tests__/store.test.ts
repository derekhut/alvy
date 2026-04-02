import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// We test migration logic by mocking fs operations and importing store
// Use a temp directory to isolate tests from real user data
let tmpDir: string;
const realHomedir = os.homedir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "alvy-test-"));
  vi.spyOn(os, "homedir").mockReturnValue(tmpDir);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// We need to re-import store for each test since DATA_DIR is computed at import time.
// Use dynamic import with cache busting.
async function importStore() {
  // Vitest caches modules, so we need to reset
  vi.resetModules();
  return await import("../store.js");
}

const sampleData = {
  streak: { current: 3, longest: 5, lastDate: "2026-04-01" },
  xp: { total: 150, today: 30 },
  dailyGoal: 3,
  rootProgress: {
    "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-01" },
  },
  wordsStudied: ["benefit", "benevolent", "benediction", "benefactor", "benign"],
};

describe("data migration", () => {
  it("migrates from old path when new path is empty", async () => {
    const oldDir = path.join(tmpDir, ".toefl-roots");
    fs.mkdirSync(oldDir, { recursive: true });
    fs.writeFileSync(
      path.join(oldDir, "data.json"),
      JSON.stringify(sampleData),
    );

    const store = await importStore();
    const data = store.loadData();

    expect(data.streak.current).toBe(3);
    expect(data.xp.total).toBe(150);
    expect(data.wordsStudied).toContain("benefit");

    // Verify new file was created
    const newFile = path.join(tmpDir, ".alvy", "data.json");
    expect(fs.existsSync(newFile)).toBe(true);
  });

  it("uses new path when both exist (already migrated)", async () => {
    const oldDir = path.join(tmpDir, ".toefl-roots");
    const newDir = path.join(tmpDir, ".alvy");
    fs.mkdirSync(oldDir, { recursive: true });
    fs.mkdirSync(newDir, { recursive: true });

    // Old data has streak 3, new data has streak 10
    fs.writeFileSync(
      path.join(oldDir, "data.json"),
      JSON.stringify(sampleData),
    );
    const newData = { ...sampleData, streak: { current: 10, longest: 10, lastDate: "2026-04-02" } };
    fs.writeFileSync(
      path.join(newDir, "data.json"),
      JSON.stringify(newData),
    );

    const store = await importStore();
    const data = store.loadData();

    // Should use new path's data (streak 10), not old (streak 3)
    expect(data.streak.current).toBe(10);
  });

  it("starts fresh when neither path exists", async () => {
    const store = await importStore();
    const data = store.loadData();

    expect(data.streak.current).toBe(0);
    expect(data.xp.total).toBe(0);
    expect(data.wordsStudied).toEqual([]);

    // Verify new dir was created
    const newDir = path.join(tmpDir, ".alvy");
    expect(fs.existsSync(newDir)).toBe(true);
  });

  it("V1 data gets V2 fields backfilled on load", async () => {
    const newDir = path.join(tmpDir, ".alvy");
    fs.mkdirSync(newDir, { recursive: true });
    fs.writeFileSync(path.join(newDir, "data.json"), JSON.stringify(sampleData));

    const store = await importStore();
    const data = store.loadData();

    expect(data.version).toBe(2);
    expect(data.streak.freezeAvailable).toBe(true);
    expect(data.streak.freezeUsedDate).toBeUndefined();
    expect(data.settings).toEqual({ sound: false, dailyGoal: 3 });

    // Verify backup was created during migration
    const backupFile = path.join(tmpDir, ".alvy", "data.backup.json");
    expect(fs.existsSync(backupFile)).toBe(true);
  });

  it("V2 data loads without re-migration", async () => {
    const v2Data = {
      version: 2,
      streak: { current: 5, longest: 5, lastDate: "2026-04-02", freezeAvailable: false, freezeUsedDate: "2026-04-01" },
      xp: { total: 200, today: 40 },
      dailyGoal: 3,
      rootProgress: {
        "bene-": { seen: true, wordsStudied: 5, lastStudied: "2026-04-02", quizAccuracy: { correct: 4, total: 5 } },
      },
      wordsStudied: ["benefit"],
      settings: { sound: true, dailyGoal: 5 },
    };
    const newDir = path.join(tmpDir, ".alvy");
    fs.mkdirSync(newDir, { recursive: true });
    fs.writeFileSync(path.join(newDir, "data.json"), JSON.stringify(v2Data));

    const store = await importStore();
    const data = store.loadData();

    expect(data.version).toBe(2);
    expect(data.streak.freezeAvailable).toBe(false);
    expect(data.streak.freezeUsedDate).toBe("2026-04-01");
    expect(data.settings).toEqual({ sound: true, dailyGoal: 5 });
    expect(data.rootProgress["bene-"]!.quizAccuracy).toEqual({ correct: 4, total: 5 });

    // No backup created for already-V2 data
    const backupFile = path.join(tmpDir, ".alvy", "data.backup.json");
    expect(fs.existsSync(backupFile)).toBe(false);
  });

  it("handles corrupt source file gracefully", async () => {
    const oldDir = path.join(tmpDir, ".toefl-roots");
    fs.mkdirSync(oldDir, { recursive: true });
    fs.writeFileSync(path.join(oldDir, "data.json"), "not json {{{");

    const store = await importStore();
    // Should not throw — corrupt data gets backed up and fresh start
    const data = store.loadData();

    expect(data.streak.current).toBe(0);
    expect(data.xp.total).toBe(0);

    // Verify backup was created
    const backupFile = path.join(tmpDir, ".alvy", "data.backup.json");
    expect(fs.existsSync(backupFile)).toBe(true);
  });
});
