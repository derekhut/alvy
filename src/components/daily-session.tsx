import React, { useMemo } from "react";
import { Box, useInput } from "ink";
import { getAllRoots, getRelatedMeanings } from "../lib/roots-db.js";
import { selectNextMorphemes } from "../lib/progress.js";
import { loadData } from "../lib/store.js";
import { useSessionFlow } from "../hooks/useSessionFlow.js";
import Dashboard from "./dashboard.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import SessionSummary from "./session-summary.js";
import Celebration from "./celebration.js";
import StreakHeader from "./streak-header.js";

export default function DailySession() {
  const allRoots = getAllRoots();
  const initialData = useMemo(() => loadData(), []);
  const morphemes = useMemo(
    () => selectNextMorphemes(initialData, allRoots, initialData.dailyGoal),
    [initialData, allRoots],
  );

  const [state, actions] = useSessionFlow(
    { morphemes, markSeen: true, checkCelebration: true },
    "dashboard",
  );

  useInput((input, key) => {
    if (input === "q") {
      actions.quit();
      return;
    }
    if (key.return) {
      switch (state.phase) {
        case "dashboard":
          actions.startSession();
          break;
        case "root-intro":
          actions.startWordWalkthrough();
          break;
        case "word-detail":
          actions.advanceWord();
          break;
        case "summary":
        case "celebration":
          actions.quit();
          break;
      }
    }
  });

  const entry = state.morphemes[state.morphemeIdx];

  switch (state.phase) {
    case "dashboard":
      return <Dashboard data={state.data} totalRoots={state.totalRoots} />;

    case "root-intro":
      return (
        <Box flexDirection="column">
          <StreakHeader data={state.data} totalRoots={state.totalRoots} />
          <RootLesson
            entry={entry!}
            index={state.morphemeIdx}
            total={state.morphemes.length}
            relatedMeanings={getRelatedMeanings(entry!)}
          />
        </Box>
      );

    case "word-detail":
      return (
        <Box flexDirection="column">
          <StreakHeader data={state.data} totalRoots={state.totalRoots} />
          <WordDetail
            word={entry!.words[state.wordIdx]!}
            wordNum={state.wordIdx + 1}
            totalWords={entry!.words.length}
            rootKey={entry!.root}
          />
        </Box>
      );

    case "summary":
      return (
        <SessionSummary
          xpEarned={state.sessionXP}
          wordsLearned={state.sessionWords}
          rootsStudied={state.morphemes.length}
          streak={state.data.streak.current}
        />
      );

    case "celebration":
      return <Celebration data={state.data} totalRoots={state.totalRoots} />;

    default:
      return null;
  }
}
