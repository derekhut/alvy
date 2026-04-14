#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import App from "./app.js";
import type { Command } from "./lib/types.js";
import { loadData, saveData } from "./lib/store.js";
import { resolveCommand } from "./lib/cli-parse.js";

const cli = meow(
  `
  用法
    $ alvy              选择科目开始学习
    $ alvy review       复习已学词根
    $ alvy test         TOEFL 刷题模式
    $ alvy psych        AP 心理学每日学习
    $ alvy psych review AP 心理学复习
    $ alvy psych test   AP 心理学刷题
    $ alvy csp          AP 计算机科学原理每日学习
    $ alvy csp review   AP 计算机科学原理复习
    $ alvy csp test     AP 计算机科学原理刷题
    $ alvy whap         AP 世界历史每日学习
    $ alvy whap review  AP 世界历史复习
    $ alvy whap test    AP 世界历史刷题
    $ alvy micro        AP 微观经济学每日学习
    $ alvy micro review AP 微观经济学复习
    $ alvy micro test   AP 微观经济学刷题
    $ alvy macro        AP 宏观经济学每日学习
    $ alvy macro review AP 宏观经济学复习
    $ alvy macro test   AP 宏观经济学刷题
    $ alvy profile      查看个人资料
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

const command = resolveCommand(cli.input[0], cli.input[1]);
if (command === null) {
  console.error(`Unknown command: ${cli.input[0]}. Run alvy --help for usage.`);
  process.exit(1);
}

render(<App command={command as Command} />);
