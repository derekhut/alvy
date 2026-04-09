import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { AvatarId, UserProfile } from "../lib/types.js";
import AvatarPicker from "./avatar-picker.js";

type Step = "name" | "avatar";

interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");

  const handleEscDefault = () => {
    onComplete({
      displayName: "学生",
      avatar: "scholar",
      createdAt: new Date().toISOString().slice(0, 10),
    });
  };

  if (step === "name") {
    return (
      <NameInput
        value={name}
        onChange={setName}
        onSubmit={(n) => {
          setName(n || "学生");
          setStep("avatar");
        }}
        onEsc={handleEscDefault}
      />
    );
  }

  return (
    <AvatarPicker
      onSelect={(avatar: AvatarId) => {
        onComplete({
          displayName: name || "学生",
          avatar,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }}
      onEsc={handleEscDefault}
    />
  );
}

interface NameInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  onEsc: () => void;
}

function NameInput({ value, onChange, onSubmit, onEsc }: NameInputProps) {
  useInput((input, key) => {
    if (key.escape) {
      onEsc();
      return;
    }
    if (key.return) {
      onSubmit(value);
      return;
    }
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }
    // Only accept printable characters, max 8 chars
    if (input && !key.ctrl && !key.meta && value.length < 8) {
      onChange(value + input);
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="#4E4E4E"
        paddingX={2}
        paddingY={1}
      >
        <Text>
          <Text bold color="#AF5FFF">alvy</Text>
        </Text>
        <Text>欢迎! 先来设置你的个人资料</Text>

        <Box marginTop={1} flexDirection="column">
          <Text>输入你的昵称 (最多 8 个字符):</Text>
          <Box marginTop={1}>
            <Text color="#AF5FFF">{"> "}</Text>
            <Text>{value}</Text>
            <Text color="#AF5FFF">_</Text>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>回车确认</Text>
        <Text dimColor>esc 跳过</Text>
      </Box>
    </Box>
  );
}
