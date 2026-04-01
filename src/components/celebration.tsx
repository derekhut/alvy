import React from "react";
import { Box, Text } from "ink";
import type { UserData } from "../lib/types.js";

interface CelebrationProps {
  data: UserData;
  totalRoots: number;
}

export default function Celebration({ data, totalRoots }: CelebrationProps) {
  const totalWords = Array.isArray(data.wordsStudied)
    ? data.wordsStudied.length
    : 0;

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="#FFAF00"
        paddingX={2}
        paddingY={1}
      >
        <Text bold color="#FFAF00">
          🌱 恭喜你！全部词根学习完成！
        </Text>

        <Box marginTop={1}>
          <Text>
            你已经学习了所有 <Text bold>{totalRoots}</Text> 个词根！
          </Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text>
            ⭐ 总经验值: <Text bold color="#FFAF00">{data.xp.total}</Text> XP
          </Text>
          <Text>
            🔥 最长连续: <Text bold>{data.streak.longest}</Text> 天
          </Text>
          <Text>
            📚 已学单词: <Text bold>{totalWords}</Text> 个
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            继续使用 toefl-roots review 来复习巩固！
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
