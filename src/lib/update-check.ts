import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "..", "package.json");

export interface UpdateInfo {
  current: string;
  latest: string;
}

export interface UpdateResult {
  success: boolean;
  message: string;
}

export interface RunUpdateOptions {
  onStdout?: (line: string) => void;
  onDone: (result: UpdateResult) => void;
}

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version as string;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(
      "https://registry.npmjs.org/@derekhut/alvy",
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as { "dist-tags": Record<string, string>; versions: Record<string, unknown> };
    // Prefer dist-tags.latest, fallback to highest version key
    const latest = data["dist-tags"]?.latest
      ?? Object.keys(data.versions ?? {}).sort().pop()
      ?? "0.0.0";
    const current = getCurrentVersion();

    if (latest === current) return null;

    // Simple semver compare: latest > current means update available
    const latestParts = latest.split(".").map(Number);
    const currentParts = current.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((latestParts[i] ?? 0) > (currentParts[i] ?? 0)) {
        return { current, latest };
      }
      if ((latestParts[i] ?? 0) < (currentParts[i] ?? 0)) {
        return null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Run `npm install -g @derekhut/alvy` as an async child process.
 * Returns the ChildProcess handle so the caller can cancel with child.kill().
 * Invokes onDone exactly once — on clean exit, failure, timeout, or kill.
 */
export function runUpdate(opts: RunUpdateOptions): ChildProcess {
  const child = spawn("npm", ["install", "-g", "@derekhut/alvy"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderrBuf = "";
  let stdoutLineBuf = "";
  let done = false;
  let watchdog: NodeJS.Timeout | null = null;
  let killEscalation: NodeJS.Timeout | null = null;

  const clearTimers = () => {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
    if (killEscalation) {
      clearTimeout(killEscalation);
      killEscalation = null;
    }
  };

  const finish = (result: UpdateResult) => {
    if (done) return;
    done = true;
    opts.onDone(result);
  };

  // 60s watchdog: SIGTERM, then SIGKILL after 5s grace
  watchdog = setTimeout(() => {
    watchdog = null;
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
    killEscalation = setTimeout(() => {
      killEscalation = null;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, 5000);
    finish({ success: false, message: "更新超时" });
  }, 60000);

  child.stdout?.on("data", (chunk: Buffer) => {
    if (!opts.onStdout) return;
    stdoutLineBuf += chunk.toString("utf-8");
    let idx: number;
    while ((idx = stdoutLineBuf.indexOf("\n")) !== -1) {
      const line = stdoutLineBuf.slice(0, idx).replace(/\r$/, "");
      stdoutLineBuf = stdoutLineBuf.slice(idx + 1);
      if (line.length > 0) opts.onStdout(line);
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    stderrBuf += chunk.toString("utf-8");
    // Keep only the tail ~400 chars to bound memory
    if (stderrBuf.length > 400) {
      stderrBuf = stderrBuf.slice(-400);
    }
  });

  child.on("error", (err) => {
    clearTimers();
    finish({
      success: false,
      message: err instanceof Error ? err.message : "未知错误",
    });
  });

  child.on("close", (code, signal) => {
    clearTimers();
    if (done) return;
    if (code === 0) {
      finish({ success: true, message: "更新成功" });
    } else {
      const tail = stderrBuf.trim().slice(-200);
      const codeLabel = code !== null ? `退出码 ${code}` : `信号 ${signal ?? "未知"}`;
      const message = tail.length > 0 ? `${codeLabel}: ${tail}` : codeLabel;
      finish({ success: false, message });
    }
  });

  return child;
}
