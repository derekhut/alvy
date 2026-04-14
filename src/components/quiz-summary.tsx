import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface QuizSummaryProps {
  correct: number;
  total: number;
  xpEarned: number;
  streak: number;
  levelUp?: { newLevel: number; oldLevel: number } | null;
  onRestart: () => void;
  onBack: () => void;
}

const options = [
  { label: "再刷一轮" },
  { label: "回到主界面" },
];

export default function QuizSummary({
  correct,
  total,
  xpEarned,
  streak,
  levelUp,
  onRestart,
  onBack,
}: QuizSummaryProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const scoreColor = pct >= 80 ? "#00D26A" : "#FF4444";
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setCursor((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      if (cursor === 0) onRestart();
      else onBack();
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
          刷题完成!
        </Text>

        <Box flexDirection="column" marginTop={1}>
          <Text>
            正确率: <Text bold color={scoreColor}>{correct}/{total} ({pct}%)</Text>
          </Text>
          <Text>
            ⭐ 获得经验: <Text bold color="#FFAF00">+{xpEarned}</Text> XP
          </Text>
          <Text>
            🔥 连续学习: <Text bold color="#FFAF00">{streak}</Text> 天
          </Text>
        </Box>

        {levelUp && (
          <Box marginTop={1}>
            <Text color="#5FD7FF">
              升级! Lv.{levelUp.oldLevel} → Lv.<Text bold color="#FFAF00">{levelUp.newLevel}</Text>
            </Text>
          </Box>
        )}

        <Box flexDirection="column" marginTop={1}>
          {options.map((opt, i) => (
            <Box key={opt.label}>
              <Text color={i === cursor ? "#AF5FFF" : undefined}>
                {i === cursor ? "  › " : "    "}
              </Text>
              <Text color={i === cursor ? "#AF5FFF" : undefined}>
                {opt.label}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>↑ ↓</Text>
        <Text dimColor>esc/q</Text>
      </Box>
    </Box>
  );
}
