import React from "react";
import { Box, Text } from "ink";
import type { UserData, RootEntry } from "../lib/types.js";

interface StreakHeaderProps {
  data: UserData;
  totalRoots: number;
  getAllUnits?: () => RootEntry[];
}

export default function StreakHeader({ data }: StreakHeaderProps) {
  return (
    <Box paddingLeft={2} paddingTop={1} gap={3}>
      <Text>
        🔥 <Text bold color="#FFAF00">{data.streak.current}</Text> 天
      </Text>
      <Text>
        ⭐ <Text bold color="#FFAF00">{data.xp.total}</Text> XP
      </Text>
      <Text dimColor>
        Lv.{data.levelProgress.level}
      </Text>
    </Box>
  );
}
