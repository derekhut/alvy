import React, { useState, useEffect, useCallback } from "react";
import type { Command, Subject, UserProfile } from "./lib/types.js";
import { loadData, saveData } from "./lib/store.js";
import { checkForUpdate } from "./lib/update-check.js";
import type { UpdateInfo } from "./lib/update-check.js";
import { SUBJECTS, SUBJECT_LIST } from "./lib/subjects.js";
import Doctor from "./components/doctor.js";
import SubjectSession from "./components/subject-session.js";
import SubjectReview from "./components/subject-review.js";
import SubjectTest from "./components/subject-test.js";
import Stats from "./components/stats.js";
import SubjectPicker from "./components/subject-picker.js";
import UpdatePrompt from "./components/update-prompt.js";
import ProfileSetup from "./components/profile-setup.js";
import ProfileView from "./components/profile-view.js";
import ModePicker from "./components/mode-picker.js";
import type { StudyMode } from "./components/mode-picker.js";

interface AppProps {
  command: Command;
}

// Build a renderer map for every Command except test commands (handled separately for onBack).
const COMMAND_RENDERERS: Partial<Record<Command, () => React.ReactElement>> = (() => {
  const map: Partial<Record<Command, () => React.ReactElement>> = {
    stats: () => <Stats />,
    doctor: () => <Doctor />,
    profile: () => <ProfileView />,
  };
  for (const cfg of SUBJECT_LIST) {
    map[cfg.sessionCommand] = () => <SubjectSession subject={cfg.id} />;
    map[cfg.reviewCommand] = () => <SubjectReview subject={cfg.id} />;
    // test commands rendered inline in App for onBack support
  }
  return map;
})();

export default function App({ command }: AppProps) {
  const [resolved, setResolved] = useState<Command | null>(
    command === "pick" ? null : command,
  );
  const [pendingSubject, setPendingSubject] = useState<Subject | null>(null);
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
    setPendingSubject(subject);
  }, [data]);

  const handleModeSelect = useCallback((mode: StudyMode) => {
    if (!pendingSubject) return;
    const cfg = SUBJECTS[pendingSubject];
    setResolved(mode === "quiz" ? cfg.testCommand : cfg.sessionCommand);
  }, [pendingSubject]);

  if (resolved === null && data) {
    // Mode picker: show after subject is selected but before session starts
    if (pendingSubject) {
      const cfg = SUBJECTS[pendingSubject];
      return (
        <ModePicker
          subjectLabel={cfg.pickerLabel}
          onSelect={handleModeSelect}
          onBack={() => setPendingSubject(null)}
        />
      );
    }

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

  // Test commands rendered with onBack so user can return to subject picker
  if (resolved) {
    const testCfg = SUBJECT_LIST.find((cfg) => cfg.testCommand === resolved);
    if (testCfg) {
      return (
        <SubjectTest
          subject={testCfg.id}
          onBack={() => {
            setResolved(null);
            setPendingSubject(null);
          }}
        />
      );
    }
    const renderer = COMMAND_RENDERERS[resolved];
    if (renderer) return renderer();
  }
  return null;
}
