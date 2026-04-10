import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { loadData } from "../lib/store.js";
import { generateStatsSummary } from "../lib/progress.js";
import { SUBJECT_LIST } from "../lib/subjects.js";

export default function Stats() {
  const { exit } = useApp();
  const data = loadData();

  useEffect(() => {
    for (const cfg of SUBJECT_LIST) {
      console.log(generateStatsSummary(data, cfg.dashboardTitle, cfg.wordNoun));
    }
    exit();
  }, []);

  return (
    <Box paddingLeft={2}>
      <Text dimColor>统计数据已输出（可通过 &gt; stats.md 保存到文件）</Text>
    </Box>
  );
}
