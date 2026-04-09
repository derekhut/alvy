import React from "react";
import { Box, Text } from "ink";

interface ContinuePromptProps {
  sessionXP: number;
  sessionWords: number;
  rootsStudied: number;
  streak: number;
}

export default function ContinuePrompt({
  sessionXP,
  sessionWords,
  rootsStudied,
  streak,
}: ContinuePromptProps) {
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
          今日目标已完成！
        </Text>

        <Box flexDirection="column" marginTop={1}>
          <Text>
            ⭐ 获得经验: <Text bold color="#FFAF00">+{sessionXP}</Text> XP
          </Text>
          <Text>
            📚 学习词根: <Text bold color="#FFAF00">{rootsStudied}</Text> 个
          </Text>
          <Text>
            📚 学习单词: <Text bold color="#FFAF00">{sessionWords}</Text> 个
          </Text>
          <Text>
            🔥 连续学习: <Text bold color="#FFAF00">{streak}</Text> 天
          </Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text color="#5FD7FF">想继续学习吗？额外 +5 XP/词 奖励！</Text>
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>→</Text>
        <Text dimColor>esc/q</Text>
      </Box>
    </Box>
  );
}
