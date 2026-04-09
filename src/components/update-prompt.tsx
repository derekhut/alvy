import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { ChildProcess } from "node:child_process";
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
  const childRef = useRef<ChildProcess | null>(null);

  const options = ["立即更新", "跳过"];

  // Cleanup: kill child process if component unmounts mid-update
  useEffect(() => {
    return () => {
      const child = childRef.current;
      if (child && !child.killed) {
        try {
          child.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useInput((input, key) => {
    if (phase === "done") {
      exit();
      return;
    }

    if (phase === "updating") {
      const isCancel =
        key.escape || input === "q" || (key.ctrl && input === "c");
      if (isCancel) {
        const child = childRef.current;
        if (child && !child.killed) {
          try {
            child.kill("SIGTERM");
          } catch {
            // ignore
          }
        }
        setResult({ success: false, message: "已取消" });
        setPhase("done");
      }
      return;
    }

    // phase === "prompt"
    if (key.upArrow) {
      setCursor((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setCursor((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      if (cursor === 0) {
        setPhase("updating");
        // Spawn in next tick so "正在更新..." renders first
        setTimeout(() => {
          childRef.current = runUpdate({
            onDone: (res) => {
              setResult(res);
              setPhase("done");
              childRef.current = null;
            },
          });
        }, 0);
      } else {
        onSkip();
      }
    } else if (key.escape || input === "q") {
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

        {phase === "updating" && (
          <Box flexDirection="column">
            <Text>正在更新...</Text>
            <Text dimColor>按 esc 取消</Text>
          </Box>
        )}

        {phase === "done" && result && (
          <Text color={result.success ? "#5FD7FF" : "#FF5F87"}>
            {result.success
              ? `更新成功！请重新运行 alvy`
              : `更新失败：${result.message}`}
          </Text>
        )}
      </Box>

      {phase === "prompt" && (
        <Box marginTop={1} justifyContent="space-between">
          <Text dimColor>↑ ↓</Text>
          <Text dimColor>esc/q 跳过</Text>
        </Box>
      )}

      {phase === "done" && result && (
        <Box marginTop={1}>
          <Text dimColor>按任意键退出</Text>
        </Box>
      )}
    </Box>
  );
}
