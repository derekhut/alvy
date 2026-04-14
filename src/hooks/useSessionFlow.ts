import { useState, useEffect, useCallback } from "react";
import { useApp } from "ink";
import type { RootEntry, RootWord, UserData, QuizQuestion } from "../lib/types.js";
import { loadData, saveData } from "../lib/store.js";
import {
  markRootSeen,
  markWordStudied,
  addXP,
  updateStreak,
  recordQuizResult,
} from "../lib/progress.js";
import { checkLevelUp } from "../lib/levels.js";

export type SessionPhase =
  | "dashboard"
  | "intro"
  | "root-intro"
  | "word-detail"
  | "quiz-intro"
  | "quiz"
  | "quiz-feedback"
  | "continue-prompt"
  | "summary"
  | "empty";

export type { QuizQuestion } from "../lib/types.js";

export interface SessionFlowOptions {
  morphemes: RootEntry[];
  totalUnits: number;
  getDistractors: (word: RootWord, currentEntry: RootEntry) => string;
  getNextBatch: (data: UserData) => RootEntry[];
  markSeen?: boolean;
  showContinuePrompt?: boolean;
}

export interface SessionFlowState {
  data: UserData;
  phase: SessionPhase;
  morphemes: RootEntry[];
  morphemeIdx: number;
  wordIdx: number;
  sessionXP: number;
  sessionWords: number;
  quizIdx: number;
  quizQuestion: QuizQuestion | null;
  quizResult: { correct: boolean; correctAnswer: string } | null;
  sessionBatch: number;
  levelUp: { newLevel: number; oldLevel: number } | null;
}

export interface SessionFlowActions {
  startSession: () => void;
  startWordWalkthrough: () => void;
  advanceWord: () => void;
  startQuiz: () => void;
  answerQuiz: (choice: number) => void;
  advanceAfterFeedback: () => void;
  continueSession: () => void;
  goToSummary: () => void;
  goBack: () => void;
  quit: () => void;
}

function generateQuizQuestion(
  word: RootWord,
  currentEntry: RootEntry,
  getDistractors: (word: RootWord, currentEntry: RootEntry) => string,
): QuizQuestion {
  const distractorMeaning = getDistractors(word, currentEntry);

  const correctIdx = Math.random() < 0.5 ? 0 : 1;
  const choices: [string, string] =
    correctIdx === 0
      ? [word.meaning_zh, distractorMeaning]
      : [distractorMeaning, word.meaning_zh];

  return { word, correctIdx, choices };
}

export function useSessionFlow(
  opts: SessionFlowOptions,
  initialPhase: SessionPhase = "dashboard",
): [SessionFlowState, SessionFlowActions] {
  const { exit } = useApp();
  const [data, setData] = useState<UserData>(() => loadData());
  const [phase, setPhase] = useState<SessionPhase>(initialPhase);
  const [morphemes, setMorphemes] = useState<RootEntry[]>(opts.morphemes);
  const [morphemeIdx, setMorphemeIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionWords, setSessionWords] = useState(0);
  const [sessionBatch, setSessionBatch] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [quizResult, setQuizResult] = useState<{
    correct: boolean;
    correctAnswer: string;
  } | null>(null);
  const [levelUp, setLevelUp] = useState<{ newLevel: number; oldLevel: number } | null>(null);

  const { markSeen = true, showContinuePrompt = true } = opts;

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

  const finishRoot = useCallback((draft?: UserData) => {
    const nextMorpheme = morphemeIdx + 1;
    if (nextMorpheme < morphemes.length) {
      setMorphemeIdx(nextMorpheme);
      setPhase("root-intro");
    } else {
      // Use caller's draft if provided — avoids stale-closure { ...data }
      // overwriting a just-applied markWordStudied update.
      const newData = draft ?? { ...data };
      updateStreak(newData);

      // Update level progress
      newData.levelProgress = { ...newData.levelProgress };
      newData.levelProgress.totalWordsStudied = newData.wordsStudied.length;
      const result = checkLevelUp(newData);
      if (result.leveledUp) {
        setLevelUp({ newLevel: result.newLevel, oldLevel: result.oldLevel });
      }

      setData(newData);
      saveData(newData);

      if (showContinuePrompt) {
        setPhase("continue-prompt");
      } else {
        setPhase("summary");
      }
    }
  }, [morphemeIdx, morphemes, data, showContinuePrompt]);

  const startSession = useCallback(() => {
    if (morphemes.length === 0) {
      setPhase("summary");
      return;
    }
    setMorphemeIdx(0);
    setPhase("root-intro");
  }, [morphemes]);

  const startWordWalkthrough = useCallback(() => {
    if (markSeen) {
      const newData = { ...data };
      markRootSeen(newData, morphemes[morphemeIdx]!.root);
      setData(newData);
    }
    setWordIdx(0);
    setPhase("word-detail");
  }, [morphemes, morphemeIdx, data, markSeen]);

  const advanceWord = useCallback(() => {
    const entry = morphemes[morphemeIdx]!;
    const currentWord = entry.words[wordIdx]!;
    const xpAmount = sessionBatch > 0 ? 15 : 10; // +5 bonus in continue mode

    const newData = { ...data };
    markWordStudied(newData, entry.root, currentWord.word);
    addXP(newData, xpAmount);
    setData(newData);
    setSessionXP((x) => x + xpAmount);
    setSessionWords((w) => w + 1);

    const nextWord = wordIdx + 1;
    if (nextWord < entry.words.length) {
      setWordIdx(nextWord);
    } else {
      // All words done for this root → skip quiz, go to next root.
      // Pass newData so finishRoot keeps the lastStudied timestamp we just
      // wrote — instead of cloning a stale `data` from its own closure.
      finishRoot(newData);
    }
  }, [morphemes, morphemeIdx, wordIdx, data, sessionBatch, finishRoot]);

  const startQuiz = useCallback(() => {
    const entry = morphemes[morphemeIdx]!;
    setQuizIdx(0);
    setQuizResult(null);
    setQuizQuestion(generateQuizQuestion(entry.words[0]!, entry, opts.getDistractors));
    setPhase("quiz");
  }, [morphemes, morphemeIdx, opts]);

  const answerQuiz = useCallback(
    (choice: number) => {
      if (!quizQuestion) return;
      const correct = choice === quizQuestion.correctIdx;
      const correctAnswer = quizQuestion.choices[quizQuestion.correctIdx]!;
      const entry = morphemes[morphemeIdx]!;

      const newData = { ...data };
      recordQuizResult(newData, entry.root, correct);
      newData.levelProgress = { ...newData.levelProgress };
      newData.levelProgress.totalQuizAttempts += 1;
      if (correct) {
        newData.levelProgress.totalCorrectQuiz += 1;
        addXP(newData, 15);
        setSessionXP((x) => x + 15);
      }
      setData(newData);

      setQuizResult({ correct, correctAnswer });
      setPhase("quiz-feedback");
    },
    [quizQuestion, data, morphemes, morphemeIdx],
  );

  const advanceAfterFeedback = useCallback(() => {
    const entry = morphemes[morphemeIdx]!;
    const nextQuiz = quizIdx + 1;

    if (nextQuiz < entry.words.length) {
      setQuizIdx(nextQuiz);
      setQuizResult(null);
      setQuizQuestion(generateQuizQuestion(entry.words[nextQuiz]!, entry, opts.getDistractors));
      setPhase("quiz");
    } else {
      // Quiz done for this root → next root or summary
      // Keep quizQuestion/quizResult until phase changes to avoid null render.
      // Pass fresh draft for consistency with advanceWord (same calling convention).
      finishRoot({ ...data });
    }
  }, [morphemes, morphemeIdx, quizIdx, finishRoot, opts, data]);

  const continueSession = useCallback(() => {
    const nextBatch = opts.getNextBatch(data);
    if (nextBatch.length === 0) {
      setPhase("summary");
      return;
    }
    setMorphemes(nextBatch);
    setMorphemeIdx(0);
    setWordIdx(0);
    setSessionBatch((b) => b + 1);
    setPhase("root-intro");
  }, [data, opts]);

  const goToSummary = useCallback(() => {
    setPhase("summary");
  }, []);

  const goBack = useCallback(() => {
    if (phase === "word-detail") {
      if (wordIdx > 0) {
        setWordIdx(wordIdx - 1);
      } else {
        // First word → back to root-intro for current morpheme
        setPhase("root-intro");
      }
    } else if (phase === "root-intro") {
      if (morphemeIdx > 0) {
        const prevEntry = morphemes[morphemeIdx - 1]!;
        setMorphemeIdx(morphemeIdx - 1);
        setWordIdx(prevEntry.words.length - 1);
        setPhase("word-detail");
      } else {
        // First morpheme → back to dashboard (or intro for review)
        setPhase(initialPhase);
      }
    }
    // Other phases: no back navigation
  }, [phase, wordIdx, morphemeIdx, morphemes, initialPhase]);

  const quit = useCallback(() => {
    saveData(data);
    exit();
  }, [data, exit]);

  const state: SessionFlowState = {
    data,
    phase,
    morphemes,
    morphemeIdx,
    wordIdx,
    sessionXP,
    sessionWords,
    quizIdx,
    quizQuestion,
    quizResult,
    sessionBatch,
    levelUp,
  };

  return [
    state,
    {
      startSession,
      startWordWalkthrough,
      advanceWord,
      startQuiz,
      answerQuiz,
      advanceAfterFeedback,
      continueSession,
      goToSummary,
      goBack,
      quit,
    },
  ];
}
