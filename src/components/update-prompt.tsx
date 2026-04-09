import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { runUpdate } from "../lib/update-check.js";
import type { UpdateInfo } from "../lib/update-check.js";

interface UpdatePromptProps {
  info: UpdateInfo;
  onSkip: () => void;
}

type Phase = "prompt" | "updating" | "done";

export default function UpdatePrompt({ info, onSkip }: UpdatePromptProps) {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<Phase>("prompt");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const options = ["立即更新", "跳过"];

  useInput((_, key) => {
    if (phase === "done") {
      exit();
      return;
    }
    if (phase !== "prompt") return;

    if (key.upArrow) {
      setCursor((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setCursor((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      if (cursor === 0) {
        setPhase("updating");
        // Run update in next tick so "正在更新..." renders first
        setTimeout(() => {
          const res = runUpdate();
          setResult(res);
          setPhase("done");
        }, 0);
      } else {
        onSkip();
      }
    } else if (key.escape) {
      onSkip();
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
        {phase === "prompt" && (
          <>
            <Text>
              {"📦 发现新版本 "}
              <Text bold color="#FFAF00">
                {info.latest}
              </Text>
              {"（当前 "}
              <Text bold color="#FFAF00">
                {info.current}
              </Text>
              {"）"}
            </Text>

            <Box flexDirection="column" marginTop={1}>
              {options.map((label, i) => (
                <Box key={label}>
                  <Text color={i === cursor ? "#AF5FFF" : undefined}>
                    {i === cursor ? "  › " : "    "}
                  </Text>
                  <Text color={i === cursor ? "#AF5FFF" : undefined}>
                    {label}
                  </Text>
                </Box>
              ))}
            </Box>
          </>
        )}

        {phase === "updating" && <Text>正在更新...</Text>}

        {phase === "done" && result && (
          <Text color={result.success ? "#5FD7FF" : "#FF5F87"}>
            {result.success
              ? `更新成功！已更新至 ${info.latest}，请重新运行 alvy`
              : `更新失败：${result.message}`}
          </Text>
        )}
      </Box>

      {phase === "prompt" && (
        <Box marginTop={1} justifyContent="space-between">
          <Text dimColor>↑ ↓</Text>
          <Text dimColor>esc 跳过</Text>
        </Box>
      )}

      {phase === "done" && (
        <Box marginTop={1}>
          <Text dimColor>按任意键退出</Text>
        </Box>
      )}
    </Box>
  );
}
