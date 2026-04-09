import React from "react";
import { Box, Text } from "ink";
import type { UserData } from "../lib/types.js";
import { loadData } from "../lib/store.js";
import { xpToNextLevel } from "../lib/levels.js";
import { AVATARS } from "../lib/avatars.js";

export default function ProfileView() {
  const data = loadData();
  const profile = data.profile;
  const lp = data.levelProgress;
  const avatar = profile ? AVATARS[profile.avatar] : AVATARS.robot;
  const displayName = profile?.displayName ?? "学生";
  const { progress } = xpToNextLevel(data.xp.total);

  const barWidth = 20;
  const filled = Math.round(progress * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const pct = Math.round(progress * 100);

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#4E4E4E"
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="column">
          {avatar.art.map((line, i) => (
            <Text key={i} color="#AF5FFF">{line}</Text>
          ))}
        </Box>
        <Text bold color="#AF5FFF">{displayName}</Text>

        <Box marginTop={1} flexDirection="column">
          <Text>
            Lv.<Text bold color="#FFAF00">{lp.level}</Text>
          </Text>
          <Box>
            <Text color="#AF5FFF">{bar}</Text>
            <Text> {pct}%</Text>
          </Box>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Text>
            综合得分: <Text bold color="#FFAF00">{lp.compositeScore}</Text>/100
          </Text>
          <Text>
            总经验值: <Text bold color="#FFAF00">{data.xp.total}</Text> XP
          </Text>
          <Text>
            🔥 连续学习: <Text bold color="#FFAF00">{data.streak.current}</Text> 天
          </Text>
          <Text>
            学习单词: <Text bold color="#FFAF00">{lp.totalWordsStudied}</Text> 个
          </Text>
          <Text>
            测验正确率: <Text bold color="#FFAF00">
              {lp.totalQuizAttempts > 0
                ? Math.round((lp.totalCorrectQuiz / lp.totalQuizAttempts) * 100)
                : 0}
            </Text>%
          </Text>
        </Box>

        {profile && (
          <Box marginTop={1}>
            <Text dimColor>加入于 {profile.createdAt}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
