import React from "react";
import { Box, Text } from "ink";

export default function Explore() {
  return (
    <Box flexDirection="column" padding={1}>
      <Box
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={1}
      >
        <Text dimColor>
          🔮 Explore mode — Coming in V2
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          AI-powered root exploration will be available in a future update.
        </Text>
      </Box>
    </Box>
  );
}
