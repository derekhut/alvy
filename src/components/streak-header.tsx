import React from "react";
import { Box, Text } from "ink";
import type { UserData } from "../lib/types.js";
import { masteredCount } from "../lib/progress.js";

interface StreakHeaderProps {
  data: UserData;
  totalRoots: number;
}

export default function StreakHeader({ data, totalRoots }: StreakHeaderProps) {
  const mastered = masteredCount(data);

  return (
    <Box paddingLeft={2} paddingTop={1} gap={3}>
      <Text>
        🔥 <Text bold color="#FFAF00">{data.streak.current}</Text> 天
      </Text>
      <Text>
        ⭐ <Text bold color="#FFAF00">{data.xp.total}</Text> XP
      </Text>
      <Text>
        📚 <Text bold>{mastered}/{totalRoots}</Text>
      </Text>
    </Box>
  );
}
