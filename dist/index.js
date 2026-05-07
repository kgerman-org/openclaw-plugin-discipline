import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { DEFAULT_CONFIG, decide, logDecision, } from "./handler.js";
export default definePluginEntry({
    id: "openclaw-discipline",
    name: "OpenClaw discipline guard",
    description: "L2-B paste-bomb guard via message_sending hook. Blocks long outbound or raw-content patterns; logs metadata only.",
    register(api) {
        api.on("message_sending", async (event) => {
            const content = event.content ?? "";
            if (!content)
                return undefined;
            const config = {
                ...DEFAULT_CONFIG,
                ...(event.context?.pluginConfig ?? {}),
            };
            const decision = decide(content, config);
            if (decision.action === "pass")
                return undefined;
            const ctx = {
                agentId: event.context?.agentId ?? null,
                channel: event.metadata?.channel ?? event.context?.channelId ?? null,
            };
            await logDecision(decision, ctx, content.length, config);
            if (decision.action === "cancel") {
                return { cancel: true, cancelReason: decision.reason };
            }
            return { content: decision.content };
        }, { priority: 50 });
    },
});
