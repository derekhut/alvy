import React, { useMemo, useCallback, useEffect } from "react";
import { Box, useInput } from "ink";
import { getAllTopics, getTopicCount, getRelatedMeanings, getDistractorMeaning } from "../lib/whap-db.js";
import { selectNextMorphemes } from "../lib/progress.js";
import { loadData } from "../lib/store.js";
import { useSessionFlow } from "../hooks/useSessionFlow.js";
import Dashboard from "./dashboard.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import QuizIntro from "./quiz-intro.js";
import Quiz from "./quiz.js";
import ContinuePrompt from "./continue-prompt.js";
import SessionSummary from "./session-summary.js";
import Celebration from "./celebration.js";
import StreakHeader from "./streak-header.js";
import type { RootLessonLabels } from "./root-lesson.js";

const whapLabels: RootLessonLabels = {
  unitLabel: "概念",
  wordListIntro: "这个概念的核心术语:",
};

export default function WhapSession() {
  const allTopics = getAllTopics();
  const initialData = useMemo(() => loadData(), []);
  const dailyGoal = initialData.settings?.dailyGoal ?? initialData.dailyGoal;
  const morphemes = useMemo(
    () => selectNextMorphemes(initialData, allTopics, dailyGoal),
    [initialData, allTopics, dailyGoal],
  );

  const getNextBatch = useCallback((data: import("../lib/types.js").UserData) => {
    return selectNextMorphemes(data, allTopics, data.settings?.dailyGoal ?? data.dailyGoal);
  }, [allTopics]);

  const [state, actions] = useSessionFlow(
    {
      morphemes,
      totalUnits: getTopicCount(),
      getAllUnits: getAllTopics,
      getDistractors: getDistractorMeaning,
      getNextBatch,
      markSeen: true,
      checkCelebration: true,
    },
    "dashboard",
  );

  useEffect(() => {
    if (state.phase !== "quiz-feedback" || !state.quizResult) return;
    const delay = state.quizResult.correct ? 500 : 1000;
    const timer = setTimeout(() => actions.advanceAfterFeedback(), delay);
    return () => clearTimeout(timer);
  }, [state.phase, state.quizResult, actions]);

  useInput((input, key) => {
    if (key.escape) {
      if (state.phase === "continue-prompt") {
        actions.goToSummary();
        return;
      }
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
        case "dashboard":
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
        case "continue-prompt":
          actions.continueSession();
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
      return (
        <Dashboard
          data={state.data}
          totalRoots={state.totalRoots}
          subject="whap"
          getAllUnits={getAllTopics}
        />
      );

    case "root-intro":
      return (
        <Box flexDirection="column">
          <StreakHeader data={state.data} totalRoots={state.totalRoots} getAllUnits={getAllTopics} />
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
          <StreakHeader data={state.data} totalRoots={state.totalRoots} getAllUnits={getAllTopics} />
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

    case "continue-prompt":
      return (
        <ContinuePrompt
          sessionXP={state.sessionXP}
          sessionWords={state.sessionWords}
          rootsStudied={state.morphemes.length}
          streak={state.data.streak.current}
        />
      );

    case "summary":
      return (
        <SessionSummary
          xpEarned={state.sessionXP}
          wordsLearned={state.sessionWords}
          rootsStudied={state.morphemes.length}
          streak={state.data.streak.current}
          bonusMode={state.sessionBatch > 0}
        />
      );

    case "celebration":
      return <Celebration data={state.data} totalRoots={state.totalRoots} />;

    default:
      return null;
  }
}
