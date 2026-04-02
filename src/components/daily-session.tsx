import React, { useMemo, useEffect } from "react";
import { Box, useInput } from "ink";
import { getAllRoots, getRelatedMeanings } from "../lib/roots-db.js";
import { selectNextMorphemes } from "../lib/progress.js";
import { loadData } from "../lib/store.js";
import { useSessionFlow } from "../hooks/useSessionFlow.js";
import Dashboard from "./dashboard.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import QuizIntro from "./quiz-intro.js";
import Quiz from "./quiz.js";
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

  // Auto-advance after quiz feedback (correct: 500ms, wrong: 1000ms)
  useEffect(() => {
    if (state.phase !== "quiz-feedback" || !state.quizResult) return;
    const delay = state.quizResult.correct ? 500 : 1000;
    const timer = setTimeout(() => actions.advanceAfterFeedback(), delay);
    return () => clearTimeout(timer);
  }, [state.phase, state.quizResult, actions]);

  useInput((input, key) => {
    if (input === "q") {
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
      return; // ignore other keys during quiz
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
        case "quiz-intro":
          actions.startQuiz();
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

    case "celebration":
      return <Celebration data={state.data} totalRoots={state.totalRoots} />;

    default:
      return null;
  }
}
