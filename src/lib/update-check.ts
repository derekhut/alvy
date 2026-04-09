import { execSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "..", "package.json");

export interface UpdateInfo {
  current: string;
  latest: string;
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

export function runUpdate(): { success: boolean; message: string } {
  try {
    execSync("npm install -g @derekhut/alvy", {
      stdio: "pipe",
      timeout: 30000,
    });
    return { success: true, message: "更新成功" };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "未知错误";
    return { success: false, message: msg };
  }
}

/** Relaunch alvy after update — spawns new process and exits current one */
export function relaunchAlvy(): void {
  const child = spawn("alvy", [], {
    stdio: "inherit",
    detached: true,
    shell: true,
  });
  child.unref();
  process.exit(0);
}
