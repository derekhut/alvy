import React, { useMemo, useCallback, useEffect } from "react";
import { Box, useInput } from "ink";
import type { Subject, UserData } from "../lib/types.js";
import { SUBJECTS } from "../lib/subjects.js";
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
import StreakHeader from "./streak-header.js";

interface SubjectSessionProps {
  subject: Subject;
}

export default function SubjectSession({ subject }: SubjectSessionProps) {
  const cfg = SUBJECTS[subject];
  const allEntries = cfg.db.getAll();
  const initialData = useMemo(() => loadData(), []);
  const dailyGoal = initialData.settings?.dailyGoal ?? initialData.dailyGoal;
  const morphemes = useMemo(
    () => selectNextMorphemes(initialData, allEntries, dailyGoal),
    [initialData, allEntries, dailyGoal],
  );

  const getNextBatch = useCallback(
    (data: UserData) => selectNextMorphemes(data, allEntries, data.settings?.dailyGoal ?? data.dailyGoal),
    [allEntries],
  );

  const [state, actions] = useSessionFlow(
    {
      morphemes,
      totalUnits: cfg.db.getCount(),
      getDistractors: cfg.db.getDistractorMeaning,
      getNextBatch,
      markSeen: true,
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
    if (key.escape || input === "q") {
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
          actions.quit();
          break;
      }
    }
  });

  const entry = state.morphemes[state.morphemeIdx];

  switch (state.phase) {
    case "dashboard":
      return <Dashboard data={state.data} title={cfg.dashboardTitle} />;

    case "root-intro":
      return (
        <Box flexDirection="column">
          <StreakHeader data={state.data} />
          <RootLesson
            entry={entry!}
            index={state.morphemeIdx}
            total={state.morphemes.length}
            relatedMeanings={cfg.db.getRelatedMeanings(entry!)}
            labels={cfg.rootLessonLabels}
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
            hideFrequency={cfg.hideFrequency}
            derivationLabel={cfg.wordDetailDerivationLabel}
            wordLabel={cfg.wordNoun}
          />
        </Box>
      );

    case "quiz-intro":
      return (
        <QuizIntro
          rootKey={entry!.root}
          wordCount={entry!.words.length}
          quizTitle={cfg.quizTitle}
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
          levelUp={state.levelUp}
        />
      );

    default:
      return null;
  }
}
