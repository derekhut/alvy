import type { UserData, RootEntry } from "./types.js";

/** Count fully studied roots (all 5 words seen) */
export function masteredCount(data: UserData): number {
  return Object.values(data.rootProgress).filter(
    (p) => p.seen && p.wordsStudied >= 5
  ).length;
}

/** Count roots that have been started */
export function seenCount(data: UserData): number {
  return Object.values(data.rootProgress).filter((p) => p.seen).length;
}

/** Update streak based on today's date */
export function updateStreak(data: UserData): void {
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = data.streak.lastDate;

  if (lastDate === today) return;

  if (lastDate) {
    const last = new Date(lastDate);
    const now = new Date(today);
    const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    data.streak.current = diffDays === 1 ? data.streak.current + 1 : 1;
  } else {
    data.streak.current = 1;
  }

  data.streak.lastDate = today;
  if (data.streak.current > data.streak.longest) {
    data.streak.longest = data.streak.current;
  }
}

/** Add XP */
export function addXP(data: UserData, points: number = 10): void {
  const today = new Date().toISOString().slice(0, 10);
  if (data.streak.lastDate !== today) {
    data.xp.today = 0;
  }
  data.xp.total += points;
  data.xp.today += points;
}

/** Mark a root as seen and track words studied */
export function markRootSeen(data: UserData, rootKey: string): void {
  if (!data.rootProgress[rootKey]) {
    data.rootProgress[rootKey] = {
      seen: true,
      wordsStudied: 0,
      lastStudied: null,
    };
  } else {
    data.rootProgress[rootKey]!.seen = true;
  }
}

/** Mark a word as studied */
export function markWordStudied(
  data: UserData,
  rootKey: string,
  word: string
): void {
  if (!data.wordsStudied.includes(word)) {
    data.wordsStudied.push(word);
  }

  const progress = data.rootProgress[rootKey];
  if (progress) {
    progress.wordsStudied = (progress.wordsStudied || 0) + 1;
    progress.lastStudied = new Date().toISOString().slice(0, 10);
  }
}

/** Select next morphemes for a daily session */
export function selectNextMorphemes(
  data: UserData,
  allRoots: RootEntry[],
  count: number = 3
): RootEntry[] {
  // Unseen morphemes first (sequential order)
  const unseen = allRoots.filter((r) => !data.rootProgress[r.root]?.seen);
  if (unseen.length > 0) {
    return unseen.slice(0, count);
  }

  // All seen — pick least studied, tie-break by oldest lastStudied
  const sorted = [...allRoots].sort((a, b) => {
    const pA = data.rootProgress[a.root];
    const pB = data.rootProgress[b.root];
    const studiedA = pA?.wordsStudied ?? 0;
    const studiedB = pB?.wordsStudied ?? 0;
    if (studiedA !== studiedB) return studiedA - studiedB;
    const dateA = pA?.lastStudied ?? "";
    const dateB = pB?.lastStudied ?? "";
    return dateA.localeCompare(dateB);
  });

  return sorted.slice(0, count);
}

/** Record a quiz result for a root */
export function recordQuizResult(
  data: UserData,
  rootKey: string,
  correct: boolean
): void {
  const progress = data.rootProgress[rootKey];
  if (!progress) return;

  if (!progress.quizAccuracy) {
    progress.quizAccuracy = { correct: 0, total: 0 };
  }
  progress.quizAccuracy.total += 1;
  if (correct) {
    progress.quizAccuracy.correct += 1;
  }
}

/** Check if a root needs review (for review selection) */
export function needsReview(data: UserData, rootKey: string): boolean {
  const progress = data.rootProgress[rootKey];
  if (!progress || !progress.seen) return false;

  // Not fully studied yet
  if (progress.wordsStudied < 5) return true;

  // Never quizzed
  if (!progress.quizAccuracy) return true;

  // Quiz accuracy below 80%
  if (progress.quizAccuracy.total > 0) {
    const accuracy = progress.quizAccuracy.correct / progress.quizAccuracy.total;
    if (accuracy < 0.8) return true;
  }

  return false;
}

/** Select roots for review session (weak roots first) */
export function selectReviewMorphemes(
  data: UserData,
  allRoots: RootEntry[],
  count: number = 3
): RootEntry[] {
  const reviewable = allRoots
    .filter((r) => needsReview(data, r.root))
    .sort((a, b) => {
      const pA = data.rootProgress[a.root];
      const pB = data.rootProgress[b.root];

      // Sort by quiz accuracy ascending (worst first), then by wordsStudied ascending
      const accA = pA?.quizAccuracy
        ? pA.quizAccuracy.correct / (pA.quizAccuracy.total || 1)
        : 0;
      const accB = pB?.quizAccuracy
        ? pB.quizAccuracy.correct / (pB.quizAccuracy.total || 1)
        : 0;
      if (accA !== accB) return accA - accB;

      const studiedA = pA?.wordsStudied ?? 0;
      const studiedB = pB?.wordsStudied ?? 0;
      if (studiedA !== studiedB) return studiedA - studiedB;

      const dateA = pA?.lastStudied ?? "";
      const dateB = pB?.lastStudied ?? "";
      return dateA.localeCompare(dateB);
    });

  return reviewable.slice(0, count);
}

/** Generate stats summary as markdown */
export function generateStatsSummary(data: UserData, totalRoots: number): string {
  const mastered = masteredCount(data);
  const seen = seenCount(data);
  const totalWords = data.wordsStudied.length;

  return `# 词根学习进度

- **已掌握:** ${mastered}/${totalRoots} 个词根
- **已学习:** ${seen}/${totalRoots} 个词根
- **总经验值:** ${data.xp.total} XP
- **当前连续天数:** ${data.streak.current} 天
- **最长连续天数:** ${data.streak.longest} 天
- **已学单词:** ${totalWords} 个
`;
}
