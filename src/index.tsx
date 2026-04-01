#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import App from "./app.js";
import type { Command } from "./lib/types.js";

const cli = meow(
  `
  用法
    $ toefl-roots           每日学习（3 个词根，每个 5 个单词）
    $ toefl-roots review    复习已学词根
    $ toefl-roots stats     导出学习进度
    $ toefl-roots doctor    检查运行环境

  选项
    --help    显示帮助信息
    --version 显示版本号
`,
  {
    importMeta: import.meta,
  }
);

const validCommands = new Set<Command>(["daily", "review", "stats", "doctor"]);
const input = cli.input[0] as string | undefined;
const command: Command = input && validCommands.has(input as Command)
  ? (input as Command)
  : input
    ? (() => {
        console.error(`Unknown command: ${input}. Run toefl-roots --help for usage.`);
        process.exit(1);
      })()
    : "daily";

render(<App command={command as Command} />);
