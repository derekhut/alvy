import React from "react";
import { Box, Text } from "ink";

interface SessionSummaryProps {
  xpEarned: number;
  wordsLearned: number;
  rootsStudied: number;
  streak: number;
}

export default function SessionSummary({
  xpEarned,
  wordsLearned,
  rootsStudied,
  streak,
}: SessionSummaryProps) {
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
          今日学习完成！
        </Text>

        <Box flexDirection="column" marginTop={1}>
          <Text>
            ⭐ 获得经验: <Text bold color="#FFAF00">+{xpEarned}</Text> XP
          </Text>
          <Text>
            📖 学习词根: <Text bold>{rootsStudied}</Text> 个
          </Text>
          <Text>
            📝 学习单词: <Text bold>{wordsLearned}</Text> 个
          </Text>
          <Text>
            🔥 连续学习: <Text bold color="#FFAF00">{streak}</Text> 天
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>🌙 今日目标已完成，明天继续加油！</Text>
      </Box>
      <Box>
        <Text dimColor>按回车退出</Text>
      </Box>
    </Box>
  );
}
