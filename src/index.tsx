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
    $ alvy           每日学习（3 个词根，每个 5 个单词）
    $ alvy review    复习已学词根
    $ alvy stats     导出学习进度
    $ alvy doctor    检查运行环境

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

const validCommands = new Set<Command>(["daily", "review", "stats", "doctor"]);
const input = cli.input[0] as string | undefined;
const command: Command = input && validCommands.has(input as Command)
  ? (input as Command)
  : input
    ? (() => {
        console.error(`Unknown command: ${input}. Run alvy --help for usage.`);
        process.exit(1);
      })()
    : "daily";

render(<App command={command as Command} />);
