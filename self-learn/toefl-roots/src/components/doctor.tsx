import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface Check {
  label: string;
  status: "pass" | "fail" | "warn" | "pending";
  detail: string;
}

export default function Doctor() {
  const [checks, setChecks] = useState<Check[]>([
    { label: "Node.js version", status: "pending", detail: "" },
    { label: "npm access", status: "pending", detail: "" },
    { label: "CJK font rendering", status: "pending", detail: "" },
    { label: "Data directory", status: "pending", detail: "" },
  ]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const results: Check[] = [];

    // 1. Node.js version (>= 18 required)
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split(".")[0]!, 10);
    if (major >= 18) {
      results.push({
        label: "Node.js version",
        status: "pass",
        detail: `${nodeVersion} (>= 18 required)`,
      });
    } else {
      results.push({
        label: "Node.js version",
        status: "fail",
        detail: `${nodeVersion} — Node.js 18+ required. Visit https://nodejs.org`,
      });
    }

    // 2. npm access
    try {
      const npmVersion = execSync("npm --version", { encoding: "utf-8" }).trim();
      results.push({
        label: "npm access",
        status: "pass",
        detail: `npm ${npmVersion}`,
      });
    } catch {
      results.push({
        label: "npm access",
        status: "fail",
        detail: "npm not found in PATH. Is Node.js installed correctly?",
      });
    }

    // 3. CJK font rendering test
    // We print Chinese characters and check if the terminal doesn't mangle them.
    // We can't truly verify font support programmatically, but we can check locale.
    const lang = process.env["LANG"] || process.env["LC_ALL"] || "";
    const hasUtf8 = lang.toLowerCase().includes("utf") || process.platform === "darwin";
    if (hasUtf8) {
      results.push({
        label: "CJK font rendering",
        status: "pass",
        detail: `UTF-8 locale detected (${lang || "macOS default"}). Test: 善良 仁慈 好的`,
      });
    } else {
      results.push({
        label: "CJK font rendering",
        status: "warn",
        detail: `Locale: "${lang}". Set LANG=en_US.UTF-8 for CJK support. Test: 善良 仁慈 好的`,
      });
    }

    // 4. Data directory (~/.toefl-roots/)
    const dataDir = path.join(os.homedir(), ".toefl-roots");
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      // Test write permission
      const testFile = path.join(dataDir, ".doctor-test");
      fs.writeFileSync(testFile, "ok");
      fs.unlinkSync(testFile);
      results.push({
        label: "Data directory",
        status: "pass",
        detail: `${dataDir} (writable)`,
      });
    } catch (err) {
      results.push({
        label: "Data directory",
        status: "fail",
        detail: `Cannot write to ${dataDir}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    setChecks(results);
    setDone(true);
  }, []);

  const icon = (status: Check["status"]) => {
    switch (status) {
      case "pass":
        return "✓";
      case "fail":
        return "✗";
      case "warn":
        return "!";
      case "pending":
        return "…";
    }
  };

  const color = (status: Check["status"]) => {
    switch (status) {
      case "pass":
        return "green";
      case "fail":
        return "red";
      case "warn":
        return "yellow";
      case "pending":
        return "gray";
    }
  };

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>toefl-roots doctor</Text>
      <Text dimColor>Checking your environment…</Text>
      <Box flexDirection="column" marginTop={1}>
        {checks.map((check) => (
          <Box key={check.label} gap={1}>
            <Text color={color(check.status)}>{icon(check.status)}</Text>
            <Text bold>{check.label}</Text>
            <Text dimColor>{check.detail}</Text>
          </Box>
        ))}
      </Box>
      {done && (
        <Box marginTop={1}>
          {failCount === 0 ? (
            <Text color="green" bold>
              All checks passed ({passCount}/{checks.length}). Ready to learn!
            </Text>
          ) : (
            <Text color="red" bold>
              {failCount} check(s) failed. Fix the issues above before continuing.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
