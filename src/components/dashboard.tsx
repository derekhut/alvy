import React from "react";
import { Box, Text } from "ink";
import type { UserData, RootEntry } from "../lib/types.js";
import { masteredCount, seenCount } from "../lib/progress.js";
import { getAllRoots } from "../lib/roots-db.js";

interface DashboardProps {
  data: UserData;
  totalRoots: number;
  subject?: "toefl" | "psych" | "csp";
  getAllUnits?: () => RootEntry[];
}

export default function Dashboard({ data, totalRoots, subject, getAllUnits }: DashboardProps) {
  const units = getAllUnits ?? getAllRoots;
  const mastered = masteredCount(data, units());
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
        <Text>
          <Text bold color="#AF5FFF">alvy</Text>
          <Text color="#AF5FFF"> {subject === "psych" ? "AP 心理学" : subject === "csp" ? "AP 计算机科学原理" : "词根学习"}</Text>
        </Text>
        <Text dimColor>{subject === "psych" ? "用中文搞定AP心理" : subject === "csp" ? "用中文搞定AP CSP" : "解锁英语的底层逻辑"}</Text>

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

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>→</Text>
        <Text dimColor>esc</Text>
      </Box>
    </Box>
  );
}
