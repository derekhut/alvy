import React from "react";
import { Box, Text } from "ink";
import type { RootWord } from "../lib/types.js";

interface WordDetailProps {
  word: RootWord;
  wordNum: number;
  totalWords: number;
  rootKey: string;
}

const freqStars = (freq: string) => {
  switch (freq) {
    case "high":
      return "★★★";
    case "medium":
      return "★★☆";
    case "low":
      return "★☆☆";
    default:
      return "★☆☆";
  }
};

export default function WordDetail({
  word,
  wordNum,
  totalWords,
  rootKey,
}: WordDetailProps) {
  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Text dimColor>
        {rootKey} — 单词 {wordNum}/{totalWords}
      </Text>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#4E4E4E"
        paddingX={2}
        paddingY={1}
        marginTop={1}
      >
        {/* Word + frequency */}
        <Box gap={2}>
          <Text bold>{word.word}</Text>
          <Text color="#FFAF00">{freqStars(word.toefl_frequency)}</Text>
        </Box>

        {/* Derivation chain — the core learning */}
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>词根拆解:</Text>
          <Text>  {word.breakdown}</Text>
          <Text color="#AF5FFF">  → {word.derivation}</Text>
        </Box>

        {/* Chinese meaning */}
        <Box marginTop={1}>
          <Text>
            释义: <Text bold>{word.meaning_zh}</Text>
          </Text>
        </Box>
        <Box>
          <Text dimColor>({word.meaning_en})</Text>
        </Box>

        {/* Example sentence */}
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>例句:</Text>
          <Text>  {word.example}</Text>
          <Text dimColor>  {word.example_zh}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>按回车继续 →</Text>
      </Box>
    </Box>
  );
}
