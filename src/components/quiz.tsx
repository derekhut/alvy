import React from "react";
import { Box, Text } from "ink";
import type { QuizQuestion } from "../hooks/useSessionFlow.js";

interface QuizProps {
  question: QuizQuestion;
  questionNum: number;
  totalQuestions: number;
  rootKey: string;
  result: { correct: boolean; correctAnswer: string } | null;
}

export default function Quiz({
  question,
  questionNum,
  totalQuestions,
  rootKey,
  result,
}: QuizProps) {
  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Text dimColor>
        {rootKey} — 测验 {questionNum}/{totalQuestions}
      </Text>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#4E4E4E"
        paddingX={2}
        paddingY={1}
        marginTop={1}
      >
        {/* Chinese meaning prominently */}
        <Text bold>{question.word.meaning_zh}</Text>

        {/* Two choices */}
        <Box marginTop={1} flexDirection="column" gap={0}>
          {question.choices.map((choice, i) => {
            let color: string | undefined;
            if (result) {
              if (i === question.correctIdx) {
                color = "#5FD7FF"; // cyan for correct
              } else if (i !== question.correctIdx && result.correctAnswer !== choice) {
                color = "#FF5F87"; // dusty rose for wrong choice
              }
            }
            return (
              <Text key={i} color={color}>
                [{i + 1}] {choice}
              </Text>
            );
          })}
        </Box>

        {/* Feedback */}
        {result && (
          <Box marginTop={1}>
            {result.correct ? (
              <Text color="#5FD7FF" bold>
                正确! +15 XP
              </Text>
            ) : (
              <Text color="#FF5F87">
                正确答案: {result.correctAnswer}
              </Text>
            )}
          </Box>
        )}
      </Box>

      {!result && (
        <Box marginTop={1}>
          <Text dimColor>按 1 或 2 选择答案</Text>
        </Box>
      )}
    </Box>
  );
}
