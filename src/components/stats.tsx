import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { loadData } from "../lib/store.js";
import { getAllRoots, getRootCount } from "../lib/roots-db.js";
import { getAllConcepts, getConceptCount } from "../lib/psych-db.js";
import { getAllTopics as getAllMicroTopics, getTopicCount as getMicroTopicCount } from "../lib/micro-db.js";
import { generateStatsSummary } from "../lib/progress.js";

export default function Stats() {
  const { exit } = useApp();
  const data = loadData();

  const toeflSummary = generateStatsSummary(data, getRootCount(), getAllRoots(), "toefl");
  const psychSummary = generateStatsSummary(data, getConceptCount(), getAllConcepts(), "psych");
  const microSummary = generateStatsSummary(data, getMicroTopicCount(), getAllMicroTopics(), "micro");

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
