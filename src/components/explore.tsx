import React from "react";
import { Box, Text } from "ink";

export default function Explore() {
  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Box
        borderStyle="round"
        borderColor="#4E4E4E"
        paddingX={2}
        paddingY={1}
      >
        <Text dimColor>
          探索模式 — 即将在 V2 推出
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          AI 驱动的词根探索功能将在未来更新中推出。
        </Text>
      </Box>
    </Box>
  );
}
