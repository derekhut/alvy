import React, { useState, useEffect, useCallback } from "react";
import type { Command, Subject, UserProfile } from "./lib/types.js";
import { loadData, saveData } from "./lib/store.js";
import { checkForUpdate } from "./lib/update-check.js";
import type { UpdateInfo } from "./lib/update-check.js";
import Doctor from "./components/doctor.js";
import DailySession from "./components/daily-session.js";
import ReviewSession from "./components/review-session.js";
import PsychSession from "./components/psych-session.js";
import PsychReview from "./components/psych-review.js";
import CspSession from "./components/csp-session.js";
import CspReview from "./components/csp-review.js";
import WhapSession from "./components/whap-session.js";
import WhapReview from "./components/whap-review.js";
import Stats from "./components/stats.js";
import SubjectPicker from "./components/subject-picker.js";
import UpdatePrompt from "./components/update-prompt.js";
import ProfileSetup from "./components/profile-setup.js";
import ProfileView from "./components/profile-view.js";

interface AppProps {
  command: Command;
}

export default function App({ command }: AppProps) {
  const [resolved, setResolved] = useState<Command | null>(
    command === "pick" ? null : command,
  );
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateChecked, setUpdateChecked] = useState(command !== "pick");
  const [updateSkipped, setUpdateSkipped] = useState(false);
  const [profileDone, setProfileDone] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [data, setData] = useState(() => (command === "pick" ? loadData() : null));

  useEffect(() => {
    if (command !== "pick") return;
    checkForUpdate().then((info) => {
      if (info) setUpdateInfo(info);
      setUpdateChecked(true);
    });
  }, [command]);

  const handleProfileComplete = useCallback((profile: UserProfile) => {
    if (data) {
      data.profile = profile;
      saveData(data);
      setData(loadData());
    }
    setProfileDone(true);
  }, [data]);

  const handleEditProfileComplete = useCallback((profile: UserProfile) => {
    if (data && data.profile) {
      const updated = { ...profile, createdAt: data.profile.createdAt };
      data.profile = updated;
      saveData(data);
      setData(loadData());
    }
    setEditingProfile(false);
  }, [data]);

  const handleSelect = useCallback((subject: Subject) => {
    if (data) {
      if (!data.settings) {
        data.settings = { sound: false, dailyGoal: data.dailyGoal };
      }
      data.settings.lastSubject = subject;
      saveData(data);
    }
    setResolved(subject === "psych" ? "psych" : subject === "csp" ? "csp" : subject === "whap" ? "whap" : "daily");
  }, [data]);

  if (resolved === null && data && updateChecked) {
    if (updateInfo && !updateSkipped) {
      return (
        <UpdatePrompt
          info={updateInfo}
          onSkip={() => setUpdateSkipped(true)}
        />
      );
    }
    // Profile setup gate: show on first launch when profile is undefined
    if (!data.profile && !profileDone) {
      return <ProfileSetup onComplete={handleProfileComplete} />;
    }
    if (editingProfile && data.profile) {
      return (
        <ProfileSetup
          onComplete={handleEditProfileComplete}
          initialName={data.profile.displayName}
          initialAvatar={data.profile.avatar}
        />
      );
    }
    return (
      <SubjectPicker
        data={data}
        onSelect={handleSelect}
        onEditProfile={() => setEditingProfile(true)}
      />
    );
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
    case "whap":
      return <WhapSession />;
    case "whap-review":
      return <WhapReview />;
    case "stats":
      return <Stats />;
    case "doctor":
      return <Doctor />;
    case "profile":
      return <ProfileView />;
    default:
      return null;
  }
}
