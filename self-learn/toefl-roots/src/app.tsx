import React from "react";
import type { Command } from "./lib/types.js";
import Doctor from "./components/doctor.js";
import DailySession from "./components/daily-session.js";
import ReviewSession from "./components/review-session.js";
import Stats from "./components/stats.js";

interface AppProps {
  command: Command;
}

export default function App({ command }: AppProps) {
  switch (command) {
    case "daily":
      return <DailySession />;
    case "review":
      return <ReviewSession />;
    case "stats":
      return <Stats />;
    case "doctor":
      return <Doctor />;
  }
}
