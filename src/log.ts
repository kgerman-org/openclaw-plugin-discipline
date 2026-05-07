import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export type LogEntry = {
  timestamp_iso: string;
  layer: "L2-B";
  agent_id: string | null;
  tool_or_action: string;
  reason: string;
  content_total_length: number;
  severity: "hard-deny" | "truncate" | "warning";
};

let dirEnsured = false;

export async function appendBlockLog(
  path: string,
  entry: LogEntry,
): Promise<void> {
  if (!dirEnsured) {
    try {
      await mkdir(dirname(path), { recursive: true });
      dirEnsured = true;
    } catch {
      dirEnsured = true;
    }
  }
  const line = JSON.stringify(entry) + "\n";
  try {
    await appendFile(path, line, { encoding: "utf8" });
  } catch (err) {
    console.error(
      `[openclaw-discipline] failed to append log to ${path}: ${err}`,
    );
  }
}
