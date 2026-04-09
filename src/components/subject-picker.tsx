import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { UserData, Subject } from "../lib/types.js";
import { masteredCount } from "../lib/progress.js";
import { getAllRoots, getRootCount } from "../lib/roots-db.js";
import { getAllConcepts, getConceptCount } from "../lib/psych-db.js";
import { getAllTopics, getTopicCount } from "../lib/csp-db.js";
import { getAllTopics as getAllWhapTopics, getTopicCount as getWhapTopicCount } from "../lib/whap-db.js";
import { AVATARS } from "../lib/avatars.js";

interface SubjectOption {
  key: Subject;
  label: string;
  mastered: number;
  total: number;
}

interface SubjectPickerProps {
  data: UserData;
  onSelect: (subject: Subject) => void;
}

export default function SubjectPicker({ data, onSelect }: SubjectPickerProps) {
  const { exit } = useApp();

  const subjects: SubjectOption[] = [
    {
      key: "toefl",
      label: "TOEFL 词根",
      mastered: masteredCount(data, getAllRoots()),
      total: getRootCount(),
    },
    {
      key: "psych",
      label: "AP 心理学",
      mastered: masteredCount(data, getAllConcepts()),
      total: getConceptCount(),
    },
    {
      key: "csp",
      label: "AP 计算机科学原理",
      mastered: masteredCount(data, getAllTopics()),
      total: getTopicCount(),
    },
    {
      key: "whap",
      label: "AP 世界历史",
      mastered: masteredCount(data, getAllWhapTopics()),
      total: getWhapTopicCount(),
    },
  ];

  const lastSubject = data.settings?.lastSubject;
  const initialIndex = lastSubject
    ? subjects.findIndex((s) => s.key === lastSubject)
    : 0;

  const [cursor, setCursor] = useState(Math.max(0, initialIndex));

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => (prev > 0 ? prev - 1 : subjects.length - 1));
    } else if (key.downArrow) {
      setCursor((prev) => (prev < subjects.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onSelect(subjects[cursor]!.key);
    } else if (key.escape) {
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
        {data.profile ? (
          <Box flexDirection="row" gap={1}>
            <Box flexDirection="column">
              {AVATARS[data.profile.avatar].art.map((line, i) => (
                <Text key={i} color="#AF5FFF">{line}</Text>
              ))}
            </Box>
            <Box flexDirection="column" justifyContent="flex-end">
              <Text>{data.profile.displayName} · Lv.<Text bold color="#FFAF00">{data.levelProgress.level}</Text></Text>
            </Box>
          </Box>
        ) : (
          <Text bold color="#AF5FFF">alvy</Text>
        )}
        <Text>选择学习科目</Text>

        <Box flexDirection="column" marginTop={1}>
          {subjects.map((s, i) => (
            <Box key={s.key}>
              <Text color={i === cursor ? "#AF5FFF" : undefined}>
                {i === cursor ? "  › " : "    "}
              </Text>
              <Text color={i === cursor ? "#AF5FFF" : undefined}>
                {s.label}
              </Text>
              <Text>{"  "}</Text>
              <Text bold color="#FFAF00">{s.mastered}</Text>
              <Text>/{s.total} 已掌握</Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1} gap={3}>
          <Text>
            🔥 连续 <Text bold color="#FFAF00">{data.streak.current}</Text> 天
          </Text>
          <Text>
            ⭐ <Text bold color="#FFAF00">{data.xp.total}</Text> XP
          </Text>
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>↑ ↓</Text>
        <Text dimColor>esc</Text>
      </Box>
    </Box>
  );
}
