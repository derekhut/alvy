#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import App from "./app.js";
import type { Command } from "./lib/types.js";

const cli = meow(
  `
  Usage
    $ toefl-roots           Daily session (3 roots + drills)
    $ toefl-roots review    Practice weak morphemes
    $ toefl-roots stats     Export progress summary
    $ toefl-roots doctor    Check environment

  Options
    --help    Show this help
    --version Show version
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
