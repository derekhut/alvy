import { useState, useEffect, useCallback } from "react";
import { useApp } from "ink";
import type { RootEntry, UserData } from "../lib/types.js";
import { loadData, saveData } from "../lib/store.js";
import { getRootCount } from "../lib/roots-db.js";
import {
  markRootSeen,
  markWordStudied,
  addXP,
  updateStreak,
  masteredCount,
} from "../lib/progress.js";

export type SessionPhase =
  | "dashboard"
  | "intro"
  | "root-intro"
  | "word-detail"
  | "summary"
  | "celebration"
  | "empty";

export interface SessionFlowOptions {
  morphemes: RootEntry[];
  markSeen?: boolean; // daily marks roots seen, review doesn't
  checkCelebration?: boolean; // daily checks all-mastered, review doesn't
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
}

export interface SessionFlowActions {
  startSession: () => void;
  startWordWalkthrough: () => void;
  advanceWord: () => void;
  quit: () => void;
}

export function useSessionFlow(
  opts: SessionFlowOptions,
  initialPhase: SessionPhase = "dashboard",
): [SessionFlowState, SessionFlowActions] {
  const { exit } = useApp();
  const [data, setData] = useState<UserData>(() => loadData());
  const [phase, setPhase] = useState<SessionPhase>(initialPhase);
  const [morphemeIdx, setMorphemeIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionWords, setSessionWords] = useState(0);

  const totalRoots = getRootCount();
  const { morphemes, markSeen = true, checkCelebration = true } = opts;

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

    const newData = { ...data };
    markWordStudied(newData, entry.root, currentWord.word);
    addXP(newData, 10);
    setData(newData);
    setSessionXP((x) => x + 10);
    setSessionWords((w) => w + 1);

    const nextWord = wordIdx + 1;
    if (nextWord < entry.words.length) {
      setWordIdx(nextWord);
    } else {
      const nextMorpheme = morphemeIdx + 1;
      if (nextMorpheme < morphemes.length) {
        setMorphemeIdx(nextMorpheme);
        setPhase("root-intro");
      } else {
        updateStreak(newData);
        setData(newData);
        saveData(newData);

        if (checkCelebration && masteredCount(newData) >= totalRoots) {
          setPhase("celebration");
        } else {
          setPhase("summary");
        }
      }
    }
  }, [morphemes, morphemeIdx, wordIdx, data, totalRoots, checkCelebration]);

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
  };

  return [state, { startSession, startWordWalkthrough, advanceWord, quit }];
}
