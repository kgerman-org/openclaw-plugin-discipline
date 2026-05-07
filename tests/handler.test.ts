import { describe, expect, it } from "vitest";
import { decide, DEFAULT_CONFIG } from "../src/handler.js";

describe("decide", () => {
  const cfg = DEFAULT_CONFIG;

  it("passes short prose", () => {
    const r = decide("Готово, перехожу к next task.", cfg);
    expect(r.action).toBe("pass");
  });

  it("cancels when length > hard cap", () => {
    const r = decide("a".repeat(2500), cfg);
    expect(r.action).toBe("cancel");
    if (r.action === "cancel") expect(r.reason).toContain("2000");
  });

  it("cancels on pattern match even if short", () => {
    const r = decide("%PDF-1.4\nshort but PDF", cfg);
    expect(r.action).toBe("cancel");
    if (r.action === "cancel") expect(r.reason).toContain("pdf-dump");
  });

  it("rewrites on borderline length + weak match", () => {
    const md = "| col |";
    const padded = md + "\n" + "x".repeat(1600 - md.length - 1);
    const r = decide(padded, cfg);
    expect(r.action).toBe("rewrite");
    if (r.action === "rewrite") {
      expect(r.content.length).toBeLessThan(padded.length);
      expect(r.content).toContain("[...trimmed");
    }
  });

  it("passes borderline length without weak match", () => {
    const text = "x".repeat(1700);
    const r = decide(text, cfg);
    expect(r.action).toBe("pass");
  });

  it("cancel takes precedence over rewrite when length > hard cap", () => {
    const r = decide("| col |\n" + "y".repeat(2500), cfg);
    expect(r.action).toBe("cancel");
  });
});
