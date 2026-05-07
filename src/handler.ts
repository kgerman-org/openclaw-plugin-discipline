import { detectPattern, isWeakMatch } from "./regex-stack.js";
import { appendBlockLog, type LogEntry } from "./log.js";

export type DisciplineConfig = {
  lengthCapHard: number;
  lengthCapBorderline: number;
  truncateTo: number;
  logPath: string;
};

export const DEFAULT_CONFIG: DisciplineConfig = {
  lengthCapHard: 2000,
  lengthCapBorderline: 1500,
  truncateTo: 1000,
  logPath: "/var/log/openclaw/discipline-blocks.jsonl",
};

export type Decision =
  | { action: "pass" }
  | { action: "cancel"; reason: string }
  | { action: "rewrite"; content: string; reason: string };

export type HandlerContext = {
  agentId: string | null;
  channel: string | null;
};

const CANCEL_REASON_LENGTH =
  "outbound > {N} chars: пишите короткое summary + file path / Issue URL, raw content в репо";

export function decide(
  content: string,
  config: DisciplineConfig,
): Decision {
  const len = content.length;
  const pattern = detectPattern(content);

  if (pattern.matched) {
    return {
      action: "cancel",
      reason: `${pattern.pattern}: ${pattern.reason}`,
    };
  }

  if (len > config.lengthCapHard) {
    return {
      action: "cancel",
      reason: CANCEL_REASON_LENGTH.replace("{N}", String(config.lengthCapHard)),
    };
  }

  if (len >= config.lengthCapBorderline && isWeakMatch(content)) {
    const truncated =
      content.slice(0, config.truncateTo) +
      `\n[...trimmed ${len - config.truncateTo} chars; raw в репо или file path]`;
    return {
      action: "rewrite",
      content: truncated,
      reason: `borderline ${len} chars + weak match`,
    };
  }

  return { action: "pass" };
}

export async function logDecision(
  decision: Decision,
  ctx: HandlerContext,
  contentLength: number,
  config: DisciplineConfig,
): Promise<void> {
  if (decision.action === "pass") return;

  const entry: LogEntry = {
    timestamp_iso: new Date().toISOString(),
    layer: "L2-B",
    agent_id: ctx.agentId,
    tool_or_action: ctx.channel ? `outbound:${ctx.channel}` : "outbound",
    reason: decision.reason,
    content_total_length: contentLength,
    severity: decision.action === "cancel" ? "hard-deny" : "truncate",
  };

  await appendBlockLog(config.logPath, entry);
}
