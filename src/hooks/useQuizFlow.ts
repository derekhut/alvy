import { useState, useEffect, useCallback } from "react";
import { useApp } from "ink";
import type { QuizQuestion, RootWord, UserData } from "../lib/types.js";
import type { SubjectDB } from "../lib/subject-db.js";
import { loadData, saveData } from "../lib/store.js";
import { addXP, updateStreak, recordQuizResult } from "../lib/progress.js";
import { checkLevelUp } from "../lib/levels.js";

export type QuizFlowPhase = "quiz" | "quiz-feedback" | "summary";

export interface QuizFlowState {
  data: UserData;
  phase: QuizFlowPhase;
  questionIdx: number;
  totalQuestions: number;
  question: QuizQuestion | null;
  result: { correct: boolean; correctAnswer: string } | null;
  correctCount: number;
  sessionXP: number;
  levelUp: { newLevel: number; oldLevel: number } | null;
}

export interface QuizFlowActions {
  answer: (choice: number) => void;
  advance: () => void;
  quit: () => void;
  restart: () => void;
}

/** Fisher-Yates shuffle (in-place). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Generate quiz questions from all words in the subject DB.
 * Fisher-Yates shuffle, then take the first `count` words.
 */
export function generateQuizQuestions(
  db: SubjectDB,
  count: number = 20,
): QuizQuestion[] {
  const entries = db.getAll();
  const allWords: { word: RootWord; entryRoot: string }[] = [];
  for (const entry of entries) {
    for (const word of entry.words) {
      allWords.push({ word, entryRoot: entry.root });
    }
  }

  shuffle(allWords);
  const selected = allWords.slice(0, count);

  return selected.map(({ word, entryRoot }) => {
    const entry = entries.find((e) => e.root === entryRoot)!;
    const distractorMeaning = db.getDistractorMeaning(word, entry);
    const correctIdx = Math.random() < 0.5 ? 0 : 1;
    const choices: [string, string] =
      correctIdx === 0
        ? [word.meaning_zh, distractorMeaning]
        : [distractorMeaning, word.meaning_zh];
    return { word, correctIdx, choices };
  });
}

export function useQuizFlow(
  db: SubjectDB,
  count: number = 20,
): [QuizFlowState, QuizFlowActions] {
  const { exit } = useApp();
  const [data, setData] = useState<UserData>(() => loadData());
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => generateQuizQuestions(db, count));
  const [questionIdx, setQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<QuizFlowPhase>("quiz");
  const [result, setResult] = useState<{ correct: boolean; correctAnswer: string } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [levelUp, setLevelUp] = useState<{ newLevel: number; oldLevel: number } | null>(null);

  // Save on unmount / SIGINT
  useEffect(() => {
    const save = () => saveData(data);
    const handleSigint = () => {
      save();
      process.exit(0);
    };
    process.on("SIGINT", handleSigint);
    return () => {
      save();
      process.removeListener("SIGINT", handleSigint);
    };
  }, [data]);

  const answer = useCallback(
    (choice: number) => {
      if (phase !== "quiz" || !questions[questionIdx]) return;
      const q = questions[questionIdx]!;
      const correct = choice === q.correctIdx;
      const correctAnswer = q.choices[q.correctIdx]!;

      const newData = { ...data };

      // Find the entry root for this question's word
      const entries = db.getAll();
      const entry = entries.find((e) => e.words.some((w) => w.word === q.word.word));
      if (entry) {
        recordQuizResult(newData, entry.root, correct);
      }

      newData.levelProgress = { ...newData.levelProgress };
      newData.levelProgress.totalQuizAttempts += 1;
      if (correct) {
        newData.levelProgress.totalCorrectQuiz += 1;
        addXP(newData, 15);
        setSessionXP((x) => x + 15);
        setCorrectCount((c) => c + 1);
      }
      setData(newData);
      setResult({ correct, correctAnswer });
      setPhase("quiz-feedback");
    },
    [phase, questions, questionIdx, data, db],
  );

  const advance = useCallback(() => {
    if (phase !== "quiz-feedback") return;
    const nextIdx = questionIdx + 1;
    if (nextIdx < questions.length) {
      setQuestionIdx(nextIdx);
      setResult(null);
      setPhase("quiz");
    } else {
      // All questions done — finalize
      const newData = { ...data };
      updateStreak(newData);
      newData.levelProgress = { ...newData.levelProgress };
      newData.levelProgress.totalWordsStudied = newData.wordsStudied.length;
      const levelResult = checkLevelUp(newData);
      if (levelResult.leveledUp) {
        setLevelUp({ newLevel: levelResult.newLevel, oldLevel: levelResult.oldLevel });
      }
      setData(newData);
      saveData(newData);
      setPhase("summary");
    }
  }, [phase, questionIdx, questions.length, data]);

  const restart = useCallback(() => {
    setQuestions(generateQuizQuestions(db, count));
    setQuestionIdx(0);
    setResult(null);
    setCorrectCount(0);
    setSessionXP(0);
    setLevelUp(null);
    setPhase("quiz");
  }, [db, count]);

  const quit = useCallback(() => {
    saveData(data);
    exit();
  }, [data, exit]);

  const state: QuizFlowState = {
    data,
    phase,
    questionIdx,
    totalQuestions: questions.length,
    question: questions[questionIdx] ?? null,
    result,
    correctCount,
    sessionXP,
    levelUp,
  };

  return [state, { answer, advance, quit, restart }];
}
