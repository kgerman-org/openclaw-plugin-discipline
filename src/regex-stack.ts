export type PatternMatch =
  | { matched: true; pattern: PatternId; reason: string }
  | { matched: false };

export type PatternId =
  | "pdf-dump"
  | "page-marker"
  | "md-table"
  | "csv-rows";

const PDF_HEAD = /^%PDF-/;
const PAGE_MARKER = /==== PAGE \d+ ====/;
const MD_TABLE_ROW = /^\s*\|.*\|\s*$/;
const CSV_ROW_ID = /^[A-Z]-[a-z0-9-]+-\d{3,},/;

export function detectPattern(content: string): PatternMatch {
  if (PDF_HEAD.test(content)) {
    return { matched: true, pattern: "pdf-dump", reason: "starts with %PDF-" };
  }

  const pageMarkers = content.match(/==== PAGE \d+ ====/g);
  if (pageMarkers && pageMarkers.length >= 2) {
    return {
      matched: true,
      pattern: "page-marker",
      reason: `${pageMarkers.length} page markers`,
    };
  }
  if (PAGE_MARKER.test(content)) {
    return {
      matched: true,
      pattern: "page-marker",
      reason: "page marker present",
    };
  }

  const lines = content.split("\n");

  let mdTableRows = 0;
  for (const line of lines) {
    if (MD_TABLE_ROW.test(line)) mdTableRows++;
  }
  if (mdTableRows >= 3) {
    return {
      matched: true,
      pattern: "md-table",
      reason: `${mdTableRows} markdown table rows`,
    };
  }

  let csvRows = 0;
  for (const line of lines) {
    if (CSV_ROW_ID.test(line)) csvRows++;
  }
  if (csvRows >= 3) {
    return {
      matched: true,
      pattern: "csv-rows",
      reason: `${csvRows} CSV rows with source-id pattern`,
    };
  }

  return { matched: false };
}

export function isWeakMatch(content: string): boolean {
  const lines = content.split("\n");
  let mdTableRows = 0;
  for (const line of lines) {
    if (MD_TABLE_ROW.test(line)) mdTableRows++;
  }
  if (mdTableRows >= 1 && mdTableRows < 3) return true;

  const pageMarkers = content.match(/==== PAGE \d+ ====/g);
  if (pageMarkers && pageMarkers.length === 1) return true;

  return false;
}
