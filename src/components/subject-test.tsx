import React from "react";
import { useInput } from "ink";
import type { Subject } from "../lib/types.js";
import { SUBJECTS } from "../lib/subjects.js";
import { useQuizFlow } from "../hooks/useQuizFlow.js";
import Quiz from "./quiz.js";
import QuizSummary from "./quiz-summary.js";

interface SubjectTestProps {
  subject: Subject;
  onBack?: () => void;
}

export default function SubjectTest({ subject, onBack }: SubjectTestProps) {
  const cfg = SUBJECTS[subject];
  const [state, actions] = useQuizFlow(cfg.db, 20);

  useInput((input, key) => {
    if (key.escape || input === "q") {
      actions.quit();
      return;
    }

    if (state.phase === "quiz") {
      if (input === "1") {
        actions.answer(0);
        return;
      }
      if (input === "2") {
        actions.answer(1);
        return;
      }
    }

    if (state.phase === "quiz-feedback" && key.rightArrow) {
      actions.advance();
      return;
    }
  });

  switch (state.phase) {
    case "quiz":
    case "quiz-feedback":
      return (
        <Quiz
          question={state.question!}
          questionNum={state.questionIdx + 1}
          totalQuestions={state.totalQuestions}
          rootKey={cfg.dashboardTitle}
          result={state.result}
        />
      );

    case "summary":
      return (
        <QuizSummary
          correct={state.correctCount}
          total={state.totalQuestions}
          xpEarned={state.sessionXP}
          streak={state.data.streak.current}
          levelUp={state.levelUp}
          onRestart={() => actions.restart()}
          onBack={() => {
            if (onBack) onBack();
            else actions.quit();
          }}
        />
      );

    default:
      return null;
  }
}
