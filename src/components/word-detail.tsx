import React from "react";
import { Box, Text } from "ink";
import type { RootWord } from "../lib/types.js";

interface WordDetailProps {
  word: RootWord;
  wordNum: number;
  totalWords: number;
  rootKey: string;
  hideFrequency?: boolean;
  derivationLabel?: string;
  wordLabel?: string;
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
  hideFrequency,
  derivationLabel,
  wordLabel,
}: WordDetailProps) {
  const wordLabelText = wordLabel ?? "单词";
  const derivationLabelText = derivationLabel ?? "词根拆解:";

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Text dimColor>
        {rootKey} — {wordLabelText} {wordNum}/{totalWords}
      </Text>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#4E4E4E"
        paddingX={2}
        paddingY={1}
        marginTop={1}
      >
        {/* Word + phonetic + frequency */}
        <Box gap={2}>
          <Text bold>{word.word}</Text>
          {word.phonetic && <Text dimColor>{word.phonetic}</Text>}
          {!hideFrequency && <Text color="#FFAF00">{freqStars(word.toefl_frequency)}</Text>}
        </Box>

        {/* Derivation chain — the core learning */}
        <Box marginTop={1} flexDirection="column">
          <Text>{derivationLabelText}</Text>
          <Text color="#AF5FFF">  {word.derivation}</Text>
        </Box>

        {/* Mnemonic — association memory aid */}
        {word.mnemonic && (
          <Box marginTop={1} flexDirection="column">
            <Text>联想记忆:</Text>
            <Text dimColor italic>  {word.mnemonic}</Text>
          </Box>
        )}

        {/* Chinese meaning */}
        <Box marginTop={1}>
          <Text>
            释义: {word.meaning_zh}
          </Text>
        </Box>
        <Box>
          <Text>({word.meaning_en})</Text>
        </Box>

        {/* Example sentence */}
        <Box marginTop={1} flexDirection="column">
          <Text>例句:</Text>
          <Text>  {word.example}</Text>
          <Text>  {word.example_zh}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>按回车继续 →</Text>
      </Box>
    </Box>
  );
}
