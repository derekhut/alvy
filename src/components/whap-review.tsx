import React, { useMemo, useCallback, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { getAllTopics, getTopicCount, getRelatedMeanings, getDistractorMeaning } from "../lib/whap-db.js";
import { loadData } from "../lib/store.js";
import { selectReviewMorphemes } from "../lib/progress.js";
import { useSessionFlow } from "../hooks/useSessionFlow.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import QuizIntro from "./quiz-intro.js";
import Quiz from "./quiz.js";
import SessionSummary from "./session-summary.js";
import StreakHeader from "./streak-header.js";
import type { RootLessonLabels } from "./root-lesson.js";

const whapLabels: RootLessonLabels = {
  unitLabel: "概念",
  wordListIntro: "这个概念的核心术语:",
};

export default function WhapReview() {
  const allTopics = getAllTopics();
  const initialData = useMemo(() => loadData(), []);

  const reviewMorphemes = useMemo(
    () => selectReviewMorphemes(initialData, allTopics, 3),
    [allTopics, initialData],
  );

  const getNextBatch = useCallback((data: import("../lib/types.js").UserData) => {
    return selectReviewMorphemes(data, allTopics, 3);
  }, [allTopics]);

  const [state, actions] = useSessionFlow(
    {
      morphemes: reviewMorphemes,
      totalUnits: getTopicCount(),
      getDistractors: getDistractorMeaning,
      getNextBatch,
      markSeen: false,
      showContinuePrompt: false,
    },
    reviewMorphemes.length === 0 ? "empty" : "intro",
  );

  useEffect(() => {
    if (state.phase !== "quiz-feedback" || !state.quizResult) return;
    const delay = state.quizResult.correct ? 500 : 1000;
    const timer = setTimeout(() => actions.advanceAfterFeedback(), delay);
    return () => clearTimeout(timer);
  }, [state.phase, state.quizResult, actions]);

  useInput((input, key) => {
    if (key.escape || input === "q") {
      actions.quit();
      return;
    }

    if (state.phase === "quiz") {
      if (input === "1") {
        actions.answerQuiz(0);
        return;
      }
      if (input === "2") {
        actions.answerQuiz(1);
        return;
      }
      return;
    }

    if (key.leftArrow) {
      actions.goBack();
      return;
    }

    if (key.rightArrow) {
      switch (state.phase) {
        case "intro":
          actions.startSession();
          break;
        case "root-intro":
          actions.startWordWalkthrough();
          break;
        case "word-detail":
          actions.advanceWord();
          break;
        case "quiz-intro":
          actions.startQuiz();
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
          还没有可以复习的概念
        </Text>
        <Text>先运行 alvy whap 学习新概念吧！</Text>
        <Box marginTop={1} justifyContent="flex-end">
          <Text dimColor>esc/q</Text>
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
              复习模式 — AP 世界历史
            </Text>
            <Text>
              今天复习 {state.morphemes.length} 个概念:
            </Text>
            <Box marginTop={1} flexDirection="column">
              {state.morphemes.map((r) => (
                <Text key={r.root}>
                  · {r.root} (<Text dimColor>{r.meaning_zh.split("：")[0]}</Text>)
                </Text>
              ))}
            </Box>
          </Box>
          <Box marginTop={1} justifyContent="space-between">
            <Text dimColor>→</Text>
            <Text dimColor>esc/q</Text>
          </Box>
        </Box>
      );

    case "root-intro":
      return (
        <Box flexDirection="column">
          <StreakHeader data={state.data} />
          <RootLesson
            entry={entry!}
            index={state.morphemeIdx}
            total={state.morphemes.length}
            relatedMeanings={getRelatedMeanings(entry!)}
            labels={whapLabels}
          />
        </Box>
      );

    case "word-detail":
      return (
        <Box flexDirection="column">
          <StreakHeader data={state.data} />
          <WordDetail
            word={entry!.words[state.wordIdx]!}
            wordNum={state.wordIdx + 1}
            totalWords={entry!.words.length}
            rootKey={entry!.root}
            hideFrequency
            derivationLabel="概念拆解:"
            wordLabel="术语"
          />
        </Box>
      );

    case "quiz-intro":
      return (
        <QuizIntro
          rootKey={entry!.root}
          wordCount={entry!.words.length}
          quizTitle="概念测验"
        />
      );

    case "quiz":
    case "quiz-feedback":
      return (
        <Quiz
          question={state.quizQuestion!}
          questionNum={state.quizIdx + 1}
          totalQuestions={entry!.words.length}
          rootKey={entry!.root}
          result={state.quizResult}
        />
      );

    case "summary":
      return (
        <SessionSummary
          xpEarned={state.sessionXP}
          wordsLearned={state.sessionWords}
          rootsStudied={state.morphemes.length}
          streak={state.data.streak.current}
          levelUp={state.levelUp}
        />
      );

    default:
      return null;
  }
}
