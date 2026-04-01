import React from "react";
import { Box, Text } from "ink";
import type { UserData } from "../lib/types.js";
import { masteredCount, seenCount } from "../lib/progress.js";

interface DashboardProps {
  data: UserData;
  totalRoots: number;
}

export default function Dashboard({ data, totalRoots }: DashboardProps) {
  const mastered = masteredCount(data);
  const seen = seenCount(data);

  const barWidth = 30;
  const filled = Math.round((mastered / totalRoots) * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const pct = totalRoots > 0 ? Math.round((mastered / totalRoots) * 100) : 0;

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
          toefl-roots 词根学习
        </Text>
        <Text dimColor>解锁英语的底层逻辑</Text>

        <Box marginTop={1} gap={3}>
          <Text>
            🔥 连续 <Text bold color="#FFAF00">{data.streak.current}</Text> 天
          </Text>
          <Text>
            ⭐ <Text bold color="#FFAF00">{data.xp.total}</Text> XP
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text>
            进度: <Text bold color="#FFAF00">{mastered}/{totalRoots}</Text> 已掌握（{seen} 已学习）
          </Text>
          <Box>
            <Text color="#AF5FFF">{bar}</Text>
            <Text> {pct}%</Text>
          </Box>
        </Box>

        {data.streak.longest > 1 && (
          <Box marginTop={1}>
            <Text dimColor>
              最长连续: {data.streak.longest} 天
            </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>按回车开始今天的学习 →</Text>
      </Box>
    </Box>
  );
}
