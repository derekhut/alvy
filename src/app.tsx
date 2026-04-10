import React, { useState, useEffect, useCallback } from "react";
import type { Command, Subject, UserProfile } from "./lib/types.js";
import { loadData, saveData } from "./lib/store.js";
import { checkForUpdate } from "./lib/update-check.js";
import type { UpdateInfo } from "./lib/update-check.js";
import { SUBJECTS, SUBJECT_LIST } from "./lib/subjects.js";
import Doctor from "./components/doctor.js";
import SubjectSession from "./components/subject-session.js";
import SubjectReview from "./components/subject-review.js";
import Stats from "./components/stats.js";
import SubjectPicker from "./components/subject-picker.js";
import UpdatePrompt from "./components/update-prompt.js";
import ProfileSetup from "./components/profile-setup.js";
import ProfileView from "./components/profile-view.js";

interface AppProps {
  command: Command;
}

// Build a renderer map for every Command, sourced from the registry.
const COMMAND_RENDERERS: Record<Command, () => React.ReactElement> = (() => {
  const map: Partial<Record<Command, () => React.ReactElement>> = {
    stats: () => <Stats />,
    doctor: () => <Doctor />,
    profile: () => <ProfileView />,
  };
  for (const cfg of SUBJECT_LIST) {
    map[cfg.sessionCommand] = () => <SubjectSession subject={cfg.id} />;
    map[cfg.reviewCommand] = () => <SubjectReview subject={cfg.id} />;
  }
  return map as Record<Command, () => React.ReactElement>;
})();

export default function App({ command }: AppProps) {
  const [resolved, setResolved] = useState<Command | null>(
    command === "pick" ? null : command,
  );
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateSkipped, setUpdateSkipped] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [profileDone, setProfileDone] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [data, setData] = useState(() => (command === "pick" ? loadData() : null));

  useEffect(() => {
    if (command !== "pick") return;
    checkForUpdate().then((info) => {
      if (info) setUpdateInfo(info);
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
    setResolved(SUBJECTS[subject].sessionCommand);
  }, [data]);

  if (resolved === null && data) {
    if (showUpdatePrompt && updateInfo && !updateSkipped) {
      return (
        <UpdatePrompt
          info={updateInfo}
          onSkip={() => {
            setUpdateSkipped(true);
            setShowUpdatePrompt(false);
          }}
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
        updateAvailable={updateInfo && !updateSkipped ? updateInfo : null}
        onRequestUpdate={() => setShowUpdatePrompt(true)}
      />
    );
  }

  if (resolved && COMMAND_RENDERERS[resolved]) {
    return COMMAND_RENDERERS[resolved]();
  }
  return null;
}
