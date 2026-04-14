import React from "react";
import { Box, Text } from "ink";
import type { QuizQuestion } from "../lib/types.js";

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
        {/* English word as the question */}
        <Text bold>{question.word.word}</Text>

        <Box marginTop={1} flexDirection="column" gap={0}>
          {question.choices.map((choice, i) => (
            <Text key={i}>
              [{i + 1}] {choice}
            </Text>
          ))}
        </Box>

        {result && (
          <Box marginTop={1}>
            {result.correct ? (
              <Text color="#00D26A">✅ 正确! +15 XP</Text>
            ) : (
              <Text color="#FF4444">❌ 错误!</Text>
            )}
          </Box>
        )}
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>{result ? "→" : "1  2"}</Text>
        <Text dimColor>esc/q</Text>
      </Box>
    </Box>
  );
}
