import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

// Mock child_process.spawn before importing the module under test
const spawnMock = vi.fn();
vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

// Import after mocks are set up
const { runUpdate, checkForUpdate } = await import("../update-check.js");

/**
 * A fake ChildProcess that emits events like the real thing.
 * stdout/stderr are sub-emitters; kill() is tracked via a spy.
 */
function createFakeChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
    killed: boolean;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killed = false;
  child.kill = vi.fn((_signal?: string) => {
    child.killed = true;
    return true;
  });
  return child;
}

describe("runUpdate", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onDone with success on clean exit (code 0)", () => {
    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const onDone = vi.fn();
    runUpdate({ onDone });

    child.emit("close", 0, null);

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith({
      success: true,
      message: "更新成功",
    });
  });

  it("calls onDone with failure and stderr tail when exit code is non-zero", () => {
    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const onDone = vi.fn();
    runUpdate({ onDone });

    child.stderr.emit("data", Buffer.from("EACCES: permission denied"));
    child.emit("close", 1, null);

    expect(onDone).toHaveBeenCalledTimes(1);
    const result = onDone.mock.calls[0]![0] as {
      success: boolean;
      message: string;
    };
    expect(result.success).toBe(false);
    expect(result.message).toContain("退出码 1");
    expect(result.message).toContain("EACCES: permission denied");
  });

  it("reports signal when killed (cancel path)", () => {
    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const onDone = vi.fn();
    const handle = runUpdate({ onDone });

    // Caller cancels
    handle.kill("SIGTERM");
    // Child then closes with signal
    child.emit("close", null, "SIGTERM");

    expect(onDone).toHaveBeenCalledTimes(1);
    const result = onDone.mock.calls[0]![0] as {
      success: boolean;
      message: string;
    };
    expect(result.success).toBe(false);
    expect(result.message).toContain("SIGTERM");
  });

  it("line-buffers stdout and forwards complete lines to onStdout", () => {
    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const onStdout = vi.fn();
    const onDone = vi.fn();
    runUpdate({ onStdout, onDone });

    child.stdout.emit("data", Buffer.from("line one\npartial "));
    child.stdout.emit("data", Buffer.from("line two\n"));

    expect(onStdout).toHaveBeenCalledTimes(2);
    expect(onStdout).toHaveBeenNthCalledWith(1, "line one");
    expect(onStdout).toHaveBeenNthCalledWith(2, "partial line two");
  });

  it("watchdog escalates SIGTERM then SIGKILL and fires timeout onDone once", () => {
    vi.useFakeTimers();
    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const onDone = vi.fn();
    runUpdate({ onDone });

    // Advance 60s to hit SIGTERM
    vi.advanceTimersByTime(60000);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith({
      success: false,
      message: "更新超时",
    });

    // Advance 5s more to hit SIGKILL escalation
    vi.advanceTimersByTime(5000);
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");

    // Subsequent close event should not re-invoke onDone
    child.emit("close", null, "SIGKILL");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("emits failure when child fires 'error' event", () => {
    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const onDone = vi.fn();
    runUpdate({ onDone });

    child.emit("error", new Error("ENOENT: npm not found"));

    expect(onDone).toHaveBeenCalledTimes(1);
    const result = onDone.mock.calls[0]![0] as {
      success: boolean;
      message: string;
    };
    expect(result.success).toBe(false);
    expect(result.message).toContain("ENOENT: npm not found");
  });

  it("invokes onDone only once across multiple events", () => {
    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const onDone = vi.fn();
    runUpdate({ onDone });

    child.emit("close", 0, null);
    child.emit("close", 1, null);
    child.emit("error", new Error("late"));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe("checkForUpdate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null on fetch rejection (abort / network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("AbortError")),
    );
    const info = await checkForUpdate();
    expect(info).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      }),
    );
    const info = await checkForUpdate();
    expect(info).toBeNull();
  });

  it("returns UpdateInfo when remote version is newer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          "dist-tags": { latest: "999.0.0" },
          versions: {},
        }),
      }),
    );
    const info = await checkForUpdate();
    expect(info).not.toBeNull();
    expect(info!.latest).toBe("999.0.0");
    expect(info!.current).toBeDefined();
  });

  it("returns null when remote version is older", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          "dist-tags": { latest: "0.0.1" },
          versions: {},
        }),
      }),
    );
    const info = await checkForUpdate();
    expect(info).toBeNull();
  });
});
