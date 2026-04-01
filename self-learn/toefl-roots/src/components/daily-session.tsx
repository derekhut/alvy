import React, { useState, useEffect, useCallback } from "react";
import { Box, useInput, useApp } from "ink";
import type { RootEntry, UserData } from "../lib/types.js";
import { loadData, saveData } from "../lib/store.js";
import { getAllRoots, getRootCount, getRelatedMeanings } from "../lib/roots-db.js";
import {
  selectNextMorphemes,
  markRootSeen,
  markWordStudied,
  addXP,
  updateStreak,
  masteredCount,
} from "../lib/progress.js";
import Dashboard from "./dashboard.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import SessionSummary from "./session-summary.js";
import Celebration from "./celebration.js";
import StreakHeader from "./streak-header.js";

type Phase = "dashboard" | "root-intro" | "word-detail" | "summary" | "celebration";

export default function DailySession() {
  const { exit } = useApp();
  const [data, setData] = useState<UserData>(() => loadData());
  const [phase, setPhase] = useState<Phase>("dashboard");

  const [morphemes, setMorphemes] = useState<RootEntry[]>([]);
  const [morphemeIdx, setMorphemeIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);

  // Session totals
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionWords, setSessionWords] = useState(0);

  const allRoots = getAllRoots();
  const totalRoots = getRootCount();

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
    const selected = selectNextMorphemes(data, allRoots, data.dailyGoal);
    if (selected.length === 0) {
      setPhase("celebration");
      return;
    }
    setMorphemes(selected);
    setMorphemeIdx(0);
    setPhase("root-intro");
  }, [data, allRoots]);

  const startWordWalkthrough = useCallback(() => {
    const entry = morphemes[morphemeIdx]!;
    const newData = { ...data };
    markRootSeen(newData, entry.root);
    setData(newData);
    setWordIdx(0);
    setPhase("word-detail");
  }, [morphemes, morphemeIdx, data]);

  const advanceWord = useCallback(() => {
    const entry = morphemes[morphemeIdx]!;
    const currentWord = entry.words[wordIdx]!;

    // Mark word studied and add XP
    const newData = { ...data };
    markWordStudied(newData, entry.root, currentWord.word);
    addXP(newData, 10);
    setData(newData);
    setSessionXP((x) => x + 10);
    setSessionWords((w) => w + 1);

    const nextWord = wordIdx + 1;
    if (nextWord < entry.words.length) {
      // More words in this root
      setWordIdx(nextWord);
    } else {
      // Root complete, move to next
      const nextMorpheme = morphemeIdx + 1;
      if (nextMorpheme < morphemes.length) {
        setMorphemeIdx(nextMorpheme);
        setPhase("root-intro");
      } else {
        // Session complete
        updateStreak(newData);
        setData(newData);
        saveData(newData);

        if (masteredCount(newData) >= totalRoots) {
          setPhase("celebration");
        } else {
          setPhase("summary");
        }
      }
    }
  }, [morphemes, morphemeIdx, wordIdx, data, totalRoots]);

  useInput((input, key) => {
    if (input === "q") {
      saveData(data);
      exit();
      return;
    }

    if (key.return) {
      switch (phase) {
        case "dashboard":
          startSession();
          break;
        case "root-intro":
          startWordWalkthrough();
          break;
        case "word-detail":
          advanceWord();
          break;
        case "summary":
        case "celebration":
          exit();
          break;
      }
    }
  });

  switch (phase) {
    case "dashboard":
      return <Dashboard data={data} totalRoots={totalRoots} />;

    case "root-intro":
      return (
        <Box flexDirection="column">
          <StreakHeader data={data} totalRoots={totalRoots} />
          <RootLesson
            entry={morphemes[morphemeIdx]!}
            index={morphemeIdx}
            total={morphemes.length}
            relatedMeanings={getRelatedMeanings(morphemes[morphemeIdx]!)}
          />
        </Box>
      );

    case "word-detail":
      return (
        <Box flexDirection="column">
          <StreakHeader data={data} totalRoots={totalRoots} />
          <WordDetail
            word={morphemes[morphemeIdx]!.words[wordIdx]!}
            wordNum={wordIdx + 1}
            totalWords={morphemes[morphemeIdx]!.words.length}
            rootKey={morphemes[morphemeIdx]!.root}
          />
        </Box>
      );

    case "summary":
      return (
        <SessionSummary
          xpEarned={sessionXP}
          wordsLearned={sessionWords}
          rootsStudied={morphemes.length}
          streak={data.streak.current}
        />
      );

    case "celebration":
      return <Celebration data={data} totalRoots={totalRoots} />;
  }
}
