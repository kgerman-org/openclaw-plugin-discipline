import { describe, expect, it } from "vitest";
import { detectPattern, isWeakMatch } from "../src/regex-stack.js";

describe("detectPattern", () => {
  it("matches PDF dump prefix", () => {
    const r = detectPattern("%PDF-1.4\n%binary\n... lots of bytes");
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.pattern).toBe("pdf-dump");
  });

  it("matches multi-page marker dump", () => {
    const text = "==== PAGE 1 ====\nfoo\n==== PAGE 2 ====\nbar";
    const r = detectPattern(text);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.pattern).toBe("page-marker");
  });

  it("matches single page marker", () => {
    const r = detectPattern("==== PAGE 7 ====\ncontent");
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.pattern).toBe("page-marker");
  });

  it("matches 3+ markdown table rows", () => {
    const md = [
      "| col1 | col2 |",
      "|------|------|",
      "| a    | b    |",
      "| c    | d    |",
    ].join("\n");
    const r = detectPattern(md);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.pattern).toBe("md-table");
  });

  it("matches 3+ CSV row-id lines", () => {
    const csv = [
      "S-retail-014,Магнит,2024,...",
      "S-retail-015,X5,2024,...",
      "S-retail-016,Лента,2024,...",
    ].join("\n");
    const r = detectPattern(csv);
    expect(r.matched).toBe(true);
    if (r.matched) expect(r.pattern).toBe("csv-rows");
  });

  it("does not match normal short prose", () => {
    const r = detectPattern(
      "Готово. PR #329 merged, перехожу к L2-B implementation.",
    );
    expect(r.matched).toBe(false);
  });

  it("does not match 2 markdown table rows (below threshold)", () => {
    const md = ["| a | b |", "|---|---|"].join("\n");
    const r = detectPattern(md);
    expect(r.matched).toBe(false);
  });
});

describe("isWeakMatch", () => {
  it("returns true for 1 md table row", () => {
    expect(isWeakMatch("| col1 | col2 |")).toBe(true);
  });

  it("returns true for 1 page marker", () => {
    expect(isWeakMatch("==== PAGE 1 ====\ncontent")).toBe(true);
  });

  it("returns false for clean prose", () => {
    expect(isWeakMatch("Сделано, кода 1500 chars вокруг.")).toBe(false);
  });

  it("returns false for 3+ md table rows (handled by detectPattern, not weak)", () => {
    const md = ["| a |", "| b |", "| c |"].join("\n");
    expect(isWeakMatch(md)).toBe(false);
  });
});
