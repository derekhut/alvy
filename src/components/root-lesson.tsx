import React from "react";
import { Box, Text } from "ink";
import type { RootEntry } from "../lib/types.js";

export interface RootLessonLabels {
  unitLabel?: string;       // "词根" or "概念"
  wordListIntro?: string;   // "包含这个词根的单词:" or "这个概念的核心术语:"
}

interface RootLessonProps {
  entry: RootEntry;
  index: number;
  total: number;
  relatedMeanings?: Record<string, string>;
  labels?: RootLessonLabels;
}

export default function RootLesson({
  entry,
  index,
  total,
  relatedMeanings,
  labels,
}: RootLessonProps) {
  const unitLabel = labels?.unitLabel ?? "词根";
  const wordListIntro = labels?.wordListIntro ?? "包含这个词根的单词:";
  const typeLabel =
    entry.type === "root" ? unitLabel : entry.type === "prefix" ? "前缀" : "后缀";

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Text dimColor>
        {unitLabel} {index + 1}/{total}
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
          <Text>({entry.origin})</Text>
          <Text>{typeLabel}</Text>
        </Box>
        <Box marginTop={1}>
          <Text>
            表示 "{entry.meaning_zh}"（{entry.meaning_en}）
          </Text>
        </Box>

        {entry.related.length > 0 && (
          <Box marginTop={1}>
            <Text>
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
        <Text>{wordListIntro}</Text>
        <Box marginTop={0} gap={2} flexWrap="wrap">
          {entry.words.map((w) => (
            <Text key={w.word} bold>
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
