import React, { useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { getAllRoots, getRelatedMeanings } from "../lib/roots-db.js";
import { loadData } from "../lib/store.js";
import { useSessionFlow } from "../hooks/useSessionFlow.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import SessionSummary from "./session-summary.js";
import StreakHeader from "./streak-header.js";

export default function ReviewSession() {
  const allRoots = getAllRoots();
  const initialData = useMemo(() => loadData(), []);

  const reviewMorphemes = useMemo(
    () =>
      allRoots
        .filter((r) => initialData.rootProgress[r.root]?.seen)
        .sort((a, b) => {
          const wA = initialData.rootProgress[a.root]?.wordsStudied ?? 0;
          const wB = initialData.rootProgress[b.root]?.wordsStudied ?? 0;
          return wA - wB;
        })
        .slice(0, 3),
    [allRoots, initialData],
  );

  const [state, actions] = useSessionFlow(
    { morphemes: reviewMorphemes, markSeen: false, checkCelebration: false },
    reviewMorphemes.length === 0 ? "empty" : "intro",
  );

  useInput((input, key) => {
    if (input === "q") {
      actions.quit();
      return;
    }
    if (key.return) {
      switch (state.phase) {
        case "intro":
        case "root-intro":
          actions.startWordWalkthrough();
          break;
        case "word-detail":
          actions.advanceWord();
          break;
        case "summary":
        case "empty":
          actions.quit();
          break;
      }
    }
  });

  const entry = state.morphemes[state.morphemeIdx];

  if (state.phase === "empty") {
    return (
      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        <Text bold color="#AF5FFF">
          还没有可以复习的词根
        </Text>
        <Text>先运行 alvy 学习新词根吧！</Text>
        <Box marginTop={1}>
          <Text dimColor>按回车退出</Text>
        </Box>
      </Box>
    );
  }

  switch (state.phase) {
    case "intro":
      return (
        <Box flexDirection="column" paddingLeft={2} paddingY={1}>
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="#4E4E4E"
            paddingX={2}
            paddingY={1}
          >
            <Text bold color="#AF5FFF">
              复习模式
            </Text>
            <Text>
              今天复习 {state.morphemes.length} 个词根:
            </Text>
            <Box marginTop={1} flexDirection="column">
              {state.morphemes.map((r) => (
                <Text key={r.root}>
                  · {r.root} (<Text dimColor>{r.meaning_zh}</Text>)
                </Text>
              ))}
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>按回车开始 →</Text>
          </Box>
        </Box>
      );

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

    default:
      return null;
  }
}
