import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../lib/store.js";

interface Check {
  label: string;
  status: "pass" | "fail" | "warn" | "pending";
  detail: string;
}

export default function Doctor() {
  const [checks, setChecks] = useState<Check[]>([
    { label: "Node.js 版本", status: "pending", detail: "" },
    { label: "npm 访问", status: "pending", detail: "" },
    { label: "中文字体渲染", status: "pending", detail: "" },
    { label: "数据目录", status: "pending", detail: "" },
  ]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const results: Check[] = [];

    // 1. Node.js version (>= 18 required)
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split(".")[0]!, 10);
    if (major >= 18) {
      results.push({
        label: "Node.js 版本",
        status: "pass",
        detail: `${nodeVersion}（需要 >= 18）`,
      });
    } else {
      results.push({
        label: "Node.js 版本",
        status: "fail",
        detail: `${nodeVersion} — 需要 Node.js 18+，请访问 https://nodejs.org`,
      });
    }

    // 2. npm access
    try {
      const npmVersion = execSync("npm --version", { encoding: "utf-8" }).trim();
      results.push({
        label: "npm 访问",
        status: "pass",
        detail: `npm ${npmVersion}`,
      });
    } catch {
      results.push({
        label: "npm 访问",
        status: "fail",
        detail: "未找到 npm，请确认 Node.js 安装正确",
      });
    }

    // 3. CJK font rendering test
    const lang = process.env["LANG"] || process.env["LC_ALL"] || "";
    const hasUtf8 = lang.toLowerCase().includes("utf") || process.platform === "darwin";
    if (hasUtf8) {
      results.push({
        label: "中文字体渲染",
        status: "pass",
        detail: `检测到 UTF-8（${lang || "macOS 默认"}）测试: 善良 仁慈 好的`,
      });
    } else {
      results.push({
        label: "中文字体渲染",
        status: "warn",
        detail: `当前: "${lang}"，请设置 LANG=en_US.UTF-8 以支持中文。测试: 善良 仁慈 好的`,
      });
    }

    // 4. Data directory (~/.alvy/)
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Test write permission
      const testFile = path.join(DATA_DIR, ".doctor-test");
      fs.writeFileSync(testFile, "ok");
      fs.unlinkSync(testFile);
      results.push({
        label: "数据目录",
        status: "pass",
        detail: `${DATA_DIR}（可写）`,
      });
    } catch (err) {
      results.push({
        label: "数据目录",
        status: "fail",
        detail: `无法写入 ${DATA_DIR}: ${err instanceof Error ? err.message : String(err)}`,
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
        return "#5FD7FF";
      case "fail":
        return "#FF5F87";
      case "warn":
        return "#FFAF00";
      case "pending":
        return "#6C6C6C";
    }
  };

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <Box flexDirection="column" paddingLeft={2} paddingY={1}>
      <Text bold color="#AF5FFF">alvy 环境检查</Text>
      <Text dimColor>正在检查你的环境…</Text>
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
            <Text color="#5FD7FF" bold>
              全部检查通过 ({passCount}/{checks.length})，可以开始学习！
            </Text>
          ) : (
            <Text color="#FF5F87" bold>
              {failCount} 项检查未通过，请先解决上面的问题。
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
