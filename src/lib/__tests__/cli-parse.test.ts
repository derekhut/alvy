import { describe, it, expect } from "vitest";
import { resolveCommand } from "../cli-parse.js";

describe("resolveCommand", () => {
  it("returns 'pick' for no input", () => {
    expect(resolveCommand(undefined, undefined)).toBe("pick");
  });

  it("returns 'review' for bare 'alvy review' (TOEFL)", () => {
    expect(resolveCommand("review", undefined)).toBe("review");
  });

  it("returns 'test' for bare 'alvy test' (TOEFL)", () => {
    expect(resolveCommand("test", undefined)).toBe("test");
  });

  it("returns 'psych' for 'alvy psych'", () => {
    expect(resolveCommand("psych", undefined)).toBe("psych");
  });

  it("returns 'psych-review' for 'alvy psych review' (compound)", () => {
    expect(resolveCommand("psych", "review")).toBe("psych-review");
  });

  it("returns 'psych-test' for 'alvy psych test' (compound)", () => {
    expect(resolveCommand("psych", "test")).toBe("psych-test");
  });

  it("returns 'macro-review' for 'alvy macro review' (6th subject compound)", () => {
    expect(resolveCommand("macro", "review")).toBe("macro-review");
  });

  it("returns 'macro-test' for 'alvy macro test' (6th subject compound)", () => {
    expect(resolveCommand("macro", "test")).toBe("macro-test");
  });

  it("returns null for 'alvy toefl' (toefl is not a cliToken)", () => {
    // TOEFL has cliToken: "" — the literal "toefl" token is not a valid command.
    expect(resolveCommand("toefl", undefined)).toBeNull();
  });

  it("returns null for 'alvy garbage'", () => {
    expect(resolveCommand("garbage", undefined)).toBeNull();
  });

  it("'alvy psych garbage' falls through to 'psych' (input2 ignored unless 'review'/'test')", () => {
    expect(resolveCommand("psych", "garbage")).toBe("psych");
  });

  it("returns 'stats'/'doctor'/'profile' as-is", () => {
    expect(resolveCommand("stats", undefined)).toBe("stats");
    expect(resolveCommand("doctor", undefined)).toBe("doctor");
    expect(resolveCommand("profile", undefined)).toBe("profile");
  });
});
