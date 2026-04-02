import { useState, useEffect, useCallback } from "react";
import { useApp } from "ink";
import type { RootEntry, RootWord, UserData } from "../lib/types.js";
import { loadData, saveData } from "../lib/store.js";
import { getAllRoots, getRootCount } from "../lib/roots-db.js";
import {
  markRootSeen,
  markWordStudied,
  addXP,
  updateStreak,
  masteredCount,
  recordQuizResult,
  selectNextMorphemes,
} from "../lib/progress.js";

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
  | "celebration"
  | "empty";

export interface QuizQuestion {
  word: RootWord;
  correctIdx: number; // 0 or 1
  choices: [string, string]; // two Chinese meanings
}

export interface SessionFlowOptions {
  morphemes: RootEntry[];
  markSeen?: boolean;
  checkCelebration?: boolean;
}

export interface SessionFlowState {
  data: UserData;
  phase: SessionPhase;
  morphemes: RootEntry[];
  morphemeIdx: number;
  wordIdx: number;
  sessionXP: number;
  sessionWords: number;
  totalRoots: number;
  quizIdx: number;
  quizQuestion: QuizQuestion | null;
  quizResult: { correct: boolean; correctAnswer: string } | null;
  sessionBatch: number;
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
  quit: () => void;
}

function generateQuizQuestion(
  word: RootWord,
  currentEntry: RootEntry,
): QuizQuestion {
  // Get a distractor Chinese meaning from a different word
  const allRoots = getAllRoots();
  const otherWords: RootWord[] = [];

  // First try words from other roots
  for (const root of allRoots) {
    if (root.root === currentEntry.root) continue;
    for (const w of root.words) {
      if (w.meaning_zh !== word.meaning_zh) {
        otherWords.push(w);
      }
    }
  }

  // Fallback: other words in the same root
  if (otherWords.length === 0) {
    for (const w of currentEntry.words) {
      if (w.word !== word.word && w.meaning_zh !== word.meaning_zh) {
        otherWords.push(w);
      }
    }
  }

  const distractor =
    otherWords.length > 0
      ? otherWords[Math.floor(Math.random() * otherWords.length)]!
      : { meaning_zh: "未知" }; // extreme fallback

  const correctIdx = Math.random() < 0.5 ? 0 : 1;
  const choices: [string, string] =
    correctIdx === 0
      ? [word.meaning_zh, distractor.meaning_zh]
      : [distractor.meaning_zh, word.meaning_zh];

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

  const totalRoots = getRootCount();
  const { markSeen = true, checkCelebration = true } = opts;

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

  const finishRoot = useCallback(() => {
    const nextMorpheme = morphemeIdx + 1;
    if (nextMorpheme < morphemes.length) {
      setMorphemeIdx(nextMorpheme);
      setPhase("root-intro");
    } else {
      const newData = { ...data };
      updateStreak(newData);
      setData(newData);
      saveData(newData);

      if (checkCelebration && masteredCount(newData) >= totalRoots) {
        setPhase("celebration");
      } else if (checkCelebration) {
        // Daily session: offer to continue
        setPhase("continue-prompt");
      } else {
        setPhase("summary");
      }
    }
  }, [morphemeIdx, morphemes, data, totalRoots, checkCelebration]);

  const startSession = useCallback(() => {
    if (morphemes.length === 0) {
      setPhase(checkCelebration ? "celebration" : "empty");
      return;
    }
    setMorphemeIdx(0);
    setPhase("root-intro");
  }, [morphemes, checkCelebration]);

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
      // All words done for this root → quiz-intro
      setPhase("quiz-intro");
    }
  }, [morphemes, morphemeIdx, wordIdx, data, sessionBatch]);

  const startQuiz = useCallback(() => {
    const entry = morphemes[morphemeIdx]!;
    setQuizIdx(0);
    setQuizResult(null);
    setQuizQuestion(generateQuizQuestion(entry.words[0]!, entry));
    setPhase("quiz");
  }, [morphemes, morphemeIdx]);

  const answerQuiz = useCallback(
    (choice: number) => {
      if (!quizQuestion) return;
      const correct = choice === quizQuestion.correctIdx;
      const correctAnswer = quizQuestion.choices[quizQuestion.correctIdx]!;
      const entry = morphemes[morphemeIdx]!;

      const newData = { ...data };
      recordQuizResult(newData, entry.root, correct);
      if (correct) {
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
      setQuizQuestion(generateQuizQuestion(entry.words[nextQuiz]!, entry));
      setPhase("quiz");
    } else {
      // Quiz done for this root → next root or summary
      // Keep quizQuestion/quizResult until phase changes to avoid null render
      finishRoot();
    }
  }, [morphemes, morphemeIdx, quizIdx, finishRoot]);

  const continueSession = useCallback(() => {
    const allRoots = getAllRoots();
    const nextBatch = selectNextMorphemes(data, allRoots, data.settings?.dailyGoal ?? data.dailyGoal);
    if (nextBatch.length === 0) {
      setPhase("summary");
      return;
    }
    setMorphemes(nextBatch);
    setMorphemeIdx(0);
    setWordIdx(0);
    setSessionBatch((b) => b + 1);
    setPhase("root-intro");
  }, [data]);

  const goToSummary = useCallback(() => {
    setPhase("summary");
  }, []);

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
    totalRoots,
    quizIdx,
    quizQuestion,
    quizResult,
    sessionBatch,
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
      quit,
    },
  ];
}
