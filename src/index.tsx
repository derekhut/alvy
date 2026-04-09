#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import App from "./app.js";
import type { Command } from "./lib/types.js";
import { loadData, saveData } from "./lib/store.js";

const cli = meow(
  `
  用法
    $ alvy              选择科目开始学习
    $ alvy review       复习已学词根
    $ alvy psych        AP 心理学每日学习
    $ alvy psych review AP 心理学复习
    $ alvy csp          AP 计算机科学原理每日学习
    $ alvy csp review   AP 计算机科学原理复习
    $ alvy whap         AP 世界历史每日学习
    $ alvy whap review  AP 世界历史复习
    $ alvy stats        导出学习进度
    $ alvy doctor       检查运行环境

  选项
    --goal N  设置每日学习词根数（1-10，默认 3）
    --help    显示帮助信息
    --version 显示版本号
`,
  {
    importMeta: import.meta,
    flags: {
      goal: {
        type: "number",
      },
    },
  }
);

// Handle --goal flag: persist and exit
if (cli.flags.goal !== undefined) {
  const goal = cli.flags.goal;
  if (!Number.isInteger(goal) || goal < 1 || goal > 10) {
    console.error("每日目标必须是 1-10 之间的整数");
    process.exit(1);
  }
  const data = loadData();
  data.dailyGoal = goal;
  if (!data.settings) {
    data.settings = { sound: false, dailyGoal: goal };
  } else {
    data.settings.dailyGoal = goal;
  }
  saveData(data);
  console.log(`每日目标已设置为 ${goal} 个词根`);
  process.exit(0);
}

const validCommands = new Set<Command>(["daily", "review", "stats", "doctor", "psych", "psych-review", "csp", "csp-review", "whap", "whap-review", "pick"]);
const input = cli.input[0] as string | undefined;
const input2 = cli.input[1] as string | undefined;

// Handle "alvy psych review" / "alvy csp review" as compound commands
const resolvedInput =
  input === "psych" && input2 === "review" ? "psych-review" :
  input === "csp" && input2 === "review" ? "csp-review" :
  input === "whap" && input2 === "review" ? "whap-review" :
  input;

const command: Command = resolvedInput && validCommands.has(resolvedInput as Command)
  ? (resolvedInput as Command)
  : resolvedInput
    ? (() => {
        console.error(`Unknown command: ${resolvedInput}. Run alvy --help for usage.`);
        process.exit(1);
      })()
    : "pick";

render(<App command={command as Command} />);
