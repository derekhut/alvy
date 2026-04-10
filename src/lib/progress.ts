import type { UserData, RootEntry } from "./types.js";

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
  const isNew = !data.wordsStudied.includes(word);
  if (isNew) {
    data.wordsStudied.push(word);
  }

  const progress = data.rootProgress[rootKey];
  if (progress) {
    if (isNew) {
      progress.wordsStudied = (progress.wordsStudied || 0) + 1;
    }
    // Full ISO timestamp so same-day concepts can be ordered by recency.
    // Legacy YYYY-MM-DD values still sort correctly as string prefixes.
    progress.lastStudied = new Date().toISOString();
  }
}

/** Select next morphemes for a daily session — oldest studied first (JSON order for fresh user) */
export function selectNextMorphemes(
  data: UserData,
  allRoots: RootEntry[],
  count: number = 3
): RootEntry[] {
  // Sort by oldest lastStudied (fresh users get JSON order via stable sort on empty strings)
  const sorted = [...allRoots].sort((a, b) => {
    const dateA = data.rootProgress[a.root]?.lastStudied ?? "";
    const dateB = data.rootProgress[b.root]?.lastStudied ?? "";
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
export function needsReview(data: UserData, rootKey: string, totalWords?: number): boolean {
  const progress = data.rootProgress[rootKey];
  if (!progress || !progress.seen) return false;

  // Not fully studied yet
  if (progress.wordsStudied < (totalWords ?? 5)) return true;

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
    .filter((r) => needsReview(data, r.root, r.words.length))
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
export function generateStatsSummary(
  data: UserData,
  subject?: "toefl" | "psych" | "micro",
): string {
  const totalWords = data.wordsStudied.length;

  const subjectLabel =
    subject === "psych" ? "AP 心理学" :
    subject === "micro" ? "AP 微观经济学" :
    "词根学习";
  const wordLabel = subject === "psych" || subject === "micro" ? "术语" : "单词";

  return `# ${subjectLabel}进度

- **总经验值:** ${data.xp.total} XP
- **当前连续天数:** ${data.streak.current} 天
- **最长连续天数:** ${data.streak.longest} 天
- **已学${wordLabel}:** ${totalWords} 个
`;
}
