import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  DEFAULT_CONFIG,
  decide,
  logDecision,
  type DisciplineConfig,
} from "./handler.js";

type AnyEvent = {
  content?: string;
  text?: string;
  payload?: { content?: string; text?: string };
  context?: {
    pluginConfig?: Partial<DisciplineConfig>;
    agentId?: string | null;
    sessionKey?: string | null;
    channelId?: string | null;
  };
  metadata?: { channel?: string };
};

function diag(name: string, event: AnyEvent): void {
  const len =
    (event.content ?? event.text ?? event.payload?.content ?? event.payload?.text ?? "")
      .length;
  console.error(
    `[openclaw-discipline] hook=${name} contentLen=${len} channel=${event.metadata?.channel ?? event.context?.channelId ?? "?"} keys=${Object.keys(event).join(",")}`,
  );
}

export default definePluginEntry({
  id: "openclaw-discipline",
  name: "OpenClaw discipline guard",
  description:
    "L2-B paste-bomb guard via message_sending hook. Blocks long outbound or raw-content patterns; logs metadata only.",
  register(api) {
    console.error("[openclaw-discipline] plugin entry register() called");

    api.on("gateway_start", async () => {
      console.error("[openclaw-discipline] gateway_start hook fired");
      return undefined;
    });

    const guardHandler = async (event: AnyEvent, hookName: string) => {
      diag(hookName, event);
      const content =
        event.content ?? event.text ?? event.payload?.content ?? event.payload?.text ?? "";
      if (!content) return undefined;

      const config: DisciplineConfig = {
        ...DEFAULT_CONFIG,
        ...(event.context?.pluginConfig ?? {}),
      };
      const decision = decide(content, config);
      if (decision.action === "pass") return undefined;

      const ctx = {
        agentId: event.context?.agentId ?? null,
        channel: event.metadata?.channel ?? event.context?.channelId ?? null,
      };
      await logDecision(decision, ctx, content.length, config);

      if (decision.action === "cancel") {
        return { cancel: true, cancelReason: decision.reason };
      }
      return { content: decision.content };
    };

    api.on(
      "message_sending",
      async (event: AnyEvent) => guardHandler(event, "message_sending"),
      { priority: 50 },
    );
    api.on(
      "before_dispatch",
      async (event: AnyEvent) => guardHandler(event, "before_dispatch"),
      { priority: 50 },
    );
    api.on(
      "reply_dispatch",
      async (event: AnyEvent) => guardHandler(event, "reply_dispatch"),
      { priority: 50 },
    );
    api.on(
      "message_sent",
      async (event: AnyEvent) => {
        diag("message_sent", event);
        return undefined;
      },
    );
  },
});
