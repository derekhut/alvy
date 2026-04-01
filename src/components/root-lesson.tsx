import React from "react";
import { Box, Text } from "ink";
import type { RootEntry } from "../lib/types.js";

interface RootLessonProps {
  entry: RootEntry;
  index: number;
  total: number;
  relatedMeanings?: Record<string, string>;
}

export default function RootLesson({
  entry,
  index,
  total,
  relatedMeanings,
}: RootLessonProps) {
  const typeLabel =
    entry.type === "root" ? "词根" : entry.type === "prefix" ? "前缀" : "后缀";

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Text dimColor>
        词根 {index + 1}/{total}
      </Text>

      {/* Root card */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#4E4E4E"
        paddingX={2}
        paddingY={1}
        marginTop={1}
      >
        <Box gap={2}>
          <Text bold color="#AF5FFF">
            {entry.root}
          </Text>
          <Text dimColor>({entry.origin})</Text>
          <Text dimColor>{typeLabel}</Text>
        </Box>
        <Box marginTop={1}>
          <Text>
            表示 "<Text bold color="#AF5FFF">{entry.meaning_zh}</Text>"（{entry.meaning_en}）
          </Text>
        </Box>

        {entry.related.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>
              相关:{" "}
              {entry.related
                .map((r) =>
                  relatedMeanings?.[r] ? `${r}(${relatedMeanings[r]})` : r
                )
                .join("、")}
            </Text>
          </Box>
        )}
      </Box>

      {/* Word cloud */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>包含这个词根的单词:</Text>
        <Box marginTop={0} gap={2} flexWrap="wrap">
          {entry.words.map((w) => (
            <Text key={w.word} color="#AF5FFF">
              {w.word}
            </Text>
          ))}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>按回车逐个学习 →</Text>
      </Box>
    </Box>
  );
}
