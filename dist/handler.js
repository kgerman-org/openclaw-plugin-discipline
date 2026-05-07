import { detectPattern, isWeakMatch } from "./regex-stack.js";
import { appendBlockLog } from "./log.js";
export const DEFAULT_CONFIG = {
    lengthCapHard: 2000,
    lengthCapBorderline: 1500,
    truncateTo: 1000,
    logPath: "/var/log/openclaw/discipline-blocks.jsonl",
};
const CANCEL_REASON_LENGTH = "outbound > {N} chars: пишите короткое summary + file path / Issue URL, raw content в репо";
export function decide(content, config) {
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
        const truncated = content.slice(0, config.truncateTo) +
            `\n[...trimmed ${len - config.truncateTo} chars; raw в репо или file path]`;
        return {
            action: "rewrite",
            content: truncated,
            reason: `borderline ${len} chars + weak match`,
        };
    }
    return { action: "pass" };
}
export async function logDecision(decision, ctx, contentLength, config) {
    if (decision.action === "pass")
        return;
    const entry = {
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
