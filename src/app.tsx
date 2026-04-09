import React, { useState, useMemo, useCallback } from "react";
import type { Command, Subject } from "./lib/types.js";
import { loadData, saveData } from "./lib/store.js";
import Doctor from "./components/doctor.js";
import DailySession from "./components/daily-session.js";
import ReviewSession from "./components/review-session.js";
import PsychSession from "./components/psych-session.js";
import PsychReview from "./components/psych-review.js";
import CspSession from "./components/csp-session.js";
import CspReview from "./components/csp-review.js";
import Stats from "./components/stats.js";
import SubjectPicker from "./components/subject-picker.js";

interface AppProps {
  command: Command;
}

export default function App({ command }: AppProps) {
  const [resolved, setResolved] = useState<Command | null>(
    command === "pick" ? null : command,
  );

  const data = useMemo(() => (command === "pick" ? loadData() : null), [command]);

  const handleSelect = useCallback((subject: Subject) => {
    if (data) {
      if (!data.settings) {
        data.settings = { sound: false, dailyGoal: data.dailyGoal };
      }
      data.settings.lastSubject = subject;
      saveData(data);
    }
    setResolved(subject === "psych" ? "psych" : subject === "csp" ? "csp" : "daily");
  }, [data]);

  if (resolved === null && data) {
    return <SubjectPicker data={data} onSelect={handleSelect} />;
  }

  switch (resolved) {
    case "daily":
      return <DailySession />;
    case "review":
      return <ReviewSession />;
    case "psych":
      return <PsychSession />;
    case "psych-review":
      return <PsychReview />;
    case "csp":
      return <CspSession />;
    case "csp-review":
      return <CspReview />;
    case "stats":
      return <Stats />;
    case "doctor":
      return <Doctor />;
    default:
      return null;
  }
}
