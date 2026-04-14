import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";

export type StudyMode = "cards" | "quiz";

interface ModePickerProps {
  subjectLabel: string;
  onSelect: (mode: StudyMode) => void;
  onBack: () => void;
}

const modes: { key: StudyMode; label: string }[] = [
  { key: "cards", label: "刷卡片" },
  { key: "quiz", label: "刷题" },
];

export default function ModePicker({
  subjectLabel,
  onSelect,
  onBack,
}: ModePickerProps) {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => (prev > 0 ? prev - 1 : modes.length - 1));
    } else if (key.downArrow) {
      setCursor((prev) => (prev < modes.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onSelect(modes[cursor]!.key);
    } else if (key.leftArrow) {
      onBack();
    } else if (key.escape || input === "q") {
      exit();
    }
  });

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
          {subjectLabel}
        </Text>
        <Text>选择学习模式</Text>

        <Box flexDirection="column" marginTop={1}>
          {modes.map((m, i) => (
            <Box key={m.key}>
              <Text color={i === cursor ? "#AF5FFF" : undefined}>
                {i === cursor ? "  › " : "    "}
              </Text>
              <Text color={i === cursor ? "#AF5FFF" : undefined}>
                {m.label}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>↑ ↓  ←</Text>
        <Text dimColor>esc/q</Text>
      </Box>
    </Box>
  );
}
