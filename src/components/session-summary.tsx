import React from "react";
import { Box, Text } from "ink";
import { getLevelName } from "../lib/levels.js";

interface SessionSummaryProps {
  xpEarned: number;
  wordsLearned: number;
  rootsStudied: number;
  streak: number;
  bonusMode?: boolean;
  levelUp?: { newLevel: number; oldLevel: number } | null;
}

export default function SessionSummary({
  xpEarned,
  wordsLearned,
  rootsStudied,
  streak,
  bonusMode = false,
  levelUp,
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
            {bonusMode && <Text color="#5FD7FF"> (含奖励)</Text>}
          </Text>
          <Text>
            📚 学习词根: <Text bold color="#FFAF00">{rootsStudied}</Text> 个
          </Text>
          <Text>
            📚 学习单词: <Text bold color="#FFAF00">{wordsLearned}</Text> 个
          </Text>
          <Text>
            🔥 连续学习: <Text bold color="#FFAF00">{streak}</Text> 天
          </Text>
        </Box>

        {levelUp && (
          <Box marginTop={1}>
            <Text color="#5FD7FF">
              升级! Lv.{levelUp.oldLevel} → Lv.<Text bold color="#FFAF00">{levelUp.newLevel}</Text> {getLevelName(levelUp.newLevel)}
            </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>🌙 今日目标已完成，明天继续加油！</Text>
        <Text dimColor>esc</Text>
      </Box>
    </Box>
  );
}
