import React, { useMemo, useCallback, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { getAllRoots, getRootCount, getRelatedMeanings, getDistractorMeaning } from "../lib/roots-db.js";
import { loadData } from "../lib/store.js";
import { selectReviewMorphemes } from "../lib/progress.js";
import { useSessionFlow } from "../hooks/useSessionFlow.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import QuizIntro from "./quiz-intro.js";
import Quiz from "./quiz.js";
import SessionSummary from "./session-summary.js";
import StreakHeader from "./streak-header.js";

export default function ReviewSession() {
  const allRoots = getAllRoots();
  const initialData = useMemo(() => loadData(), []);

  const reviewMorphemes = useMemo(
    () => selectReviewMorphemes(initialData, allRoots, 3),
    [allRoots, initialData],
  );

  const getNextBatch = useCallback((data: import("../lib/types.js").UserData) => {
    return selectReviewMorphemes(data, allRoots, 3);
  }, [allRoots]);

  const [state, actions] = useSessionFlow(
    {
      morphemes: reviewMorphemes,
      totalUnits: getRootCount(),
      getAllUnits: getAllRoots,
      getDistractors: getDistractorMeaning,
      getNextBatch,
      markSeen: false,
      checkCelebration: false,
    },
    reviewMorphemes.length === 0 ? "empty" : "intro",
  );

  // Auto-advance after quiz feedback (correct: 500ms, wrong: 1000ms)
  useEffect(() => {
    if (state.phase !== "quiz-feedback" || !state.quizResult) return;
    const delay = state.quizResult.correct ? 500 : 1000;
    const timer = setTimeout(() => actions.advanceAfterFeedback(), delay);
    return () => clearTimeout(timer);
  }, [state.phase, state.quizResult, actions]);

  useInput((input, key) => {
    if (key.escape) {
      actions.quit();
      return;
    }

    // Quiz: single keypress answer (1 or 2)
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
          还没有可以复习的词根
        </Text>
        <Text>先运行 alvy 学习新词根吧！</Text>
        <Box marginTop={1} justifyContent="flex-end">
          <Text dimColor>esc</Text>
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
          <Box marginTop={1} justifyContent="space-between">
            <Text dimColor>→</Text>
            <Text dimColor>esc</Text>
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

    case "quiz-intro":
      return (
        <QuizIntro
          rootKey={entry!.root}
          wordCount={entry!.words.length}
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
        />
      );

    default:
      return null;
  }
}
