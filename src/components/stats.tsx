import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { loadData } from "../lib/store.js";
import { generateStatsSummary } from "../lib/progress.js";

export default function Stats() {
  const { exit } = useApp();
  const data = loadData();

  const toeflSummary = generateStatsSummary(data, "toefl");
  const psychSummary = generateStatsSummary(data, "psych");
  const microSummary = generateStatsSummary(data, "micro");

  useEffect(() => {
    console.log(toeflSummary);
    console.log(psychSummary);
    console.log(microSummary);
    exit();
  }, []);

  return (
    <Box paddingLeft={2}>
      <Text dimColor>统计数据已输出（可通过 &gt; stats.md 保存到文件）</Text>
    </Box>
  );
}
