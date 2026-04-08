import React from "react";
import { Box, Text } from "ink";

interface QuizIntroProps {
  rootKey: string;
  wordCount: number;
  quizTitle?: string;
}

export default function QuizIntro({ rootKey, wordCount, quizTitle }: QuizIntroProps) {
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
          {quizTitle ?? "词根测验"} — {rootKey}
        </Text>
        <Box marginTop={1}>
          <Text>
            你刚学了{wordCount}个词，来测试一下！
          </Text>
        </Box>
      </Box>
      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>→</Text>
        <Text dimColor>esc</Text>
      </Box>
    </Box>
  );
}
