import type { Command } from "./types.js";
import { SUBJECT_LIST } from "./subjects.js";

/**
 * Resolve a raw CLI argv pair into a Command, or null if the input is
 * unrecognized (caller should print usage and exit). Pure function — does
 * not touch process, stdio, or the filesystem.
 *
 * Rules:
 *   []                        → "pick"
 *   ["review"]                → "review"          (bare TOEFL review)
 *   ["test"]                  → "test"            (bare TOEFL quiz)
 *   ["psych"]                 → "psych"           (any subject session)
 *   ["psych", "review"]       → "psych-review"    (any compound AP review)
 *   ["psych", "test"]         → "psych-test"      (any compound AP test)
 *   ["stats" | "doctor" | "profile" | "pick"] → itself
 *   anything else             → null
 *
 * Note: the TOEFL entry has cliToken === "" so it short-circuits the
 * compound match (input "" never equals anything the user typed).
 */
export function resolveCommand(
  input: string | undefined,
  input2: string | undefined,
): Command | null {
  if (!input) return "pick";

  // Compound commands: "psych review" → "psych-review", "psych test" → "psych-test"
  const compoundMatch = SUBJECT_LIST.find(
    (s) => s.cliToken && s.cliToken === input && (input2 === "review" || input2 === "test"),
  );
  const resolved = compoundMatch
    ? (input2 === "test" ? compoundMatch.testCommand : compoundMatch.reviewCommand)
    : input;

  const validCommands = new Set<Command>([
    "stats",
    "doctor",
    "profile",
    "pick",
    ...SUBJECT_LIST.flatMap((s) => [s.sessionCommand, s.reviewCommand, s.testCommand] as Command[]),
  ]);

  return validCommands.has(resolved as Command) ? (resolved as Command) : null;
}
