import React from "react";
import { Box, Text } from "ink";

interface QuizIntroProps {
  rootKey: string;
  wordCount: number;
}

export default function QuizIntro({ rootKey, wordCount }: QuizIntroProps) {
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
          词根测验 — {rootKey}
        </Text>
        <Box marginTop={1}>
          <Text>
            你刚学了{wordCount}个词，来测试一下！
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>按回车开始 →</Text>
      </Box>
    </Box>
  );
}
