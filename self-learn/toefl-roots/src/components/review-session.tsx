import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { RootEntry, UserData } from "../lib/types.js";
import { loadData, saveData } from "../lib/store.js";
import { getAllRoots, getRootCount, getRelatedMeanings } from "../lib/roots-db.js";
import {
  markWordStudied,
  addXP,
  updateStreak,
} from "../lib/progress.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import SessionSummary from "./session-summary.js";
import StreakHeader from "./streak-header.js";

type Phase = "intro" | "root-intro" | "word-detail" | "summary" | "empty";

export default function ReviewSession() {
  const { exit } = useApp();
  const [data, setData] = useState<UserData>(() => loadData());
  const allRoots = getAllRoots();
  const totalRoots = getRootCount();

  // Review: pick seen roots, sorted by fewest words studied
  const reviewMorphemes = allRoots
    .filter((r) => data.rootProgress[r.root]?.seen)
    .sort((a, b) => {
      const wA = data.rootProgress[a.root]?.wordsStudied ?? 0;
      const wB = data.rootProgress[b.root]?.wordsStudied ?? 0;
      return wA - wB;
    })
    .slice(0, 3);

  const [phase, setPhase] = useState<Phase>(
    reviewMorphemes.length === 0 ? "empty" : "intro"
  );

  const [morphemeIdx, setMorphemeIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionWords, setSessionWords] = useState(0);

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

  const startWordWalkthrough = useCallback(() => {
    setWordIdx(0);
    setPhase("word-detail");
  }, []);

  const advanceWord = useCallback(() => {
    const entry = reviewMorphemes[morphemeIdx]!;
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
      if (nextMorpheme < reviewMorphemes.length) {
        setMorphemeIdx(nextMorpheme);
        setPhase("root-intro");
      } else {
        updateStreak(newData);
        setData(newData);
        saveData(newData);
        setPhase("summary");
      }
    }
  }, [reviewMorphemes, morphemeIdx, wordIdx, data]);

  useInput((input, key) => {
    if (input === "q") {
      saveData(data);
      exit();
      return;
    }

    if (key.return) {
      switch (phase) {
        case "intro":
        case "root-intro":
          startWordWalkthrough();
          break;
        case "word-detail":
          advanceWord();
          break;
        case "summary":
        case "empty":
          exit();
          break;
      }
    }
  });

  if (phase === "empty") {
    return (
      <Box flexDirection="column" paddingLeft={2} paddingY={1}>
        <Text bold color="#AF5FFF">
          还没有可以复习的词根
        </Text>
        <Text>先运行 toefl-roots 学习新词根吧！</Text>
        <Box marginTop={1}>
          <Text dimColor>按回车退出</Text>
        </Box>
      </Box>
    );
  }

  switch (phase) {
    case "intro":
      return (
        <Box flexDirection="column" paddingLeft={2} paddingY={1}>
          <Text bold color="#AF5FFF">
            复习模式
          </Text>
          <Text>
            今天复习 {reviewMorphemes.length} 个词根:
          </Text>
          <Box marginTop={1} flexDirection="column">
            {reviewMorphemes.map((r) => (
              <Text key={r.root}>
                · {r.root} ({r.meaning_zh})
              </Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>按回车开始 →</Text>
          </Box>
        </Box>
      );

    case "root-intro":
      return (
        <Box flexDirection="column">
          <StreakHeader data={data} totalRoots={totalRoots} />
          <RootLesson
            entry={reviewMorphemes[morphemeIdx]!}
            index={morphemeIdx}
            total={reviewMorphemes.length}
            relatedMeanings={getRelatedMeanings(reviewMorphemes[morphemeIdx]!)}
          />
        </Box>
      );

    case "word-detail":
      return (
        <Box flexDirection="column">
          <StreakHeader data={data} totalRoots={totalRoots} />
          <WordDetail
            word={reviewMorphemes[morphemeIdx]!.words[wordIdx]!}
            wordNum={wordIdx + 1}
            totalWords={reviewMorphemes[morphemeIdx]!.words.length}
            rootKey={reviewMorphemes[morphemeIdx]!.root}
          />
        </Box>
      );

    case "summary":
      return (
        <SessionSummary
          xpEarned={sessionXP}
          wordsLearned={sessionWords}
          rootsStudied={reviewMorphemes.length}
          streak={data.streak.current}
        />
      );
  }
}
