import React from "react";
import { Box, Text } from "ink";
import type { UserData, RootEntry } from "../lib/types.js";
import { masteredCount, seenCount } from "../lib/progress.js";
import { getAllRoots } from "../lib/roots-db.js";
import { xpToNextLevel } from "../lib/levels.js";
import { AVATARS } from "../lib/avatars.js";

interface DashboardProps {
  data: UserData;
  totalRoots: number;
  subject?: "toefl" | "psych" | "csp" | "whap";
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

  const profile = data.profile;
  const avatar = profile ? AVATARS[profile.avatar] : null;
  const displayName = profile?.displayName;

  const lp = data.levelProgress;
  const { progress: lvlProgress } = xpToNextLevel(data.xp.total);
  const lvlBarWidth = 10;
  const lvlFilled = Math.round(lvlProgress * lvlBarWidth);
  const lvlEmpty = lvlBarWidth - lvlFilled;
  const lvlBar = "█".repeat(lvlFilled) + "░".repeat(lvlEmpty);
  const lvlPct = Math.round(lvlProgress * 100);

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#4E4E4E"
        paddingX={2}
        paddingY={1}
      >
        {avatar && displayName ? (
          <Box flexDirection="row" gap={1}>
            <Box flexDirection="column">
              {avatar.art.map((line, i) => (
                <Text key={i} color="#AF5FFF">{line}</Text>
              ))}
            </Box>
            <Box flexDirection="column" justifyContent="flex-end">
              <Text>{displayName} · Lv.<Text bold color="#FFAF00">{lp.level}</Text></Text>
            </Box>
          </Box>
        ) : null}
        <Text>
          <Text bold color="#AF5FFF">alvy</Text>
          <Text color="#AF5FFF"> {subject === "psych" ? "AP 心理学" : subject === "csp" ? "AP 计算机科学原理" : subject === "whap" ? "AP 世界历史" : "词根学习"}</Text>
        </Text>

        <Box marginTop={1} gap={3}>
          <Text>
            🔥 连续 <Text bold color="#FFAF00">{data.streak.current}</Text> 天
          </Text>
          <Text>
            ⭐ <Text bold color="#FFAF00">{data.xp.total}</Text> XP
          </Text>
        </Box>

        <Box>
          <Text>
            Lv.<Text bold color="#FFAF00">{lp.level}</Text> <Text color="#AF5FFF">{lvlBar}</Text> {lvlPct}%
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
        <Text dimColor>esc/q</Text>
      </Box>
    </Box>
  );
}
