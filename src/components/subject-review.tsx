import React, { useMemo, useCallback, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { Subject, UserData } from "../lib/types.js";
import { SUBJECTS } from "../lib/subjects.js";
import { loadData } from "../lib/store.js";
import { selectReviewMorphemes } from "../lib/progress.js";
import { useSessionFlow } from "../hooks/useSessionFlow.js";
import RootLesson from "./root-lesson.js";
import WordDetail from "./word-detail.js";
import QuizIntro from "./quiz-intro.js";
import Quiz from "./quiz.js";
import SessionSummary from "./session-summary.js";
import StreakHeader from "./streak-header.js";

interface SubjectReviewProps {
  subject: Subject;
}

export default function SubjectReview({ subject }: SubjectReviewProps) {
  const cfg = SUBJECTS[subject];
  const allEntries = cfg.db.getAll();
  const initialData = useMemo(() => loadData(), []);

  const reviewMorphemes = useMemo(
    () => selectReviewMorphemes(initialData, allEntries, 3),
    [allEntries, initialData],
  );

  const getNextBatch = useCallback(
    (data: UserData) => selectReviewMorphemes(data, allEntries, 3),
    [allEntries],
  );

  const [state, actions] = useSessionFlow(
    {
      morphemes: reviewMorphemes,
      totalUnits: cfg.db.getCount(),
      getDistractors: cfg.db.getDistractorMeaning,
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
          还没有可以复习的{cfg.emptyNoun}
        </Text>
        <Text>先运行 {cfg.emptyHintCmd} 学习新{cfg.emptyNoun}吧！</Text>
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
              {cfg.reviewIntroTitle}
            </Text>
            <Text>
              今天复习 {state.morphemes.length} 个{cfg.unitNoun}:
            </Text>
            <Box marginTop={1} flexDirection="column">
              {state.morphemes.map((r) => (
                <Text key={r.root}>
                  · {r.root} (<Text dimColor>{cfg.reviewMeaningSummary(r)}</Text>)
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
