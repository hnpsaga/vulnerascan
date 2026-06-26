import { VulnerabilitySeverity } from "../vulnerability/vulnerability-models.js";

/**
 * Normalizes a severity string or severity options.
 */
export function getSeverityRank(severity?: VulnerabilitySeverity[]): {
  label: string;
  score: number;
} {
  if (!severity || severity.length === 0) {
    return { label: "UNKNOWN", score: 0 };
  }

  // Find cvss score, prioritize cvss v3 if available, or just any score
  const cvss = severity.find((s) => s.type.toLowerCase().startsWith("cvss"));
  if (cvss) {
    const scoreVal = parseFloat(cvss.score);
    if (!isNaN(scoreVal)) {
      if (scoreVal >= 9.0) return { label: "CRITICAL", score: 4 };
      if (scoreVal >= 7.0) return { label: "HIGH", score: 3 };
      if (scoreVal >= 4.0) return { label: "MEDIUM", score: 2 };
      if (scoreVal >= 0.1) return { label: "LOW", score: 1 };
      return { label: "UNKNOWN", score: 0 };
    }
  }

  // Fallback to searching for explicit labels in type/score
  for (const s of severity) {
    const typeLower = s.type.toLowerCase();
    const scoreLower = s.score.toLowerCase();
    if (typeLower.includes("critical") || scoreLower.includes("critical"))
      return { label: "CRITICAL", score: 4 };
    if (typeLower.includes("high") || scoreLower.includes("high"))
      return { label: "HIGH", score: 3 };
    if (typeLower.includes("medium") || scoreLower.includes("medium"))
      return { label: "MEDIUM", score: 2 };
    if (typeLower.includes("low") || scoreLower.includes("low")) return { label: "LOW", score: 1 };
  }

  return { label: "UNKNOWN", score: 0 };
}

/**
 * Formats a Date object or string into a display date string: YYYY-MM-DD HH:MM.
 */
export function formatDisplayDate(dateInput?: Date | string): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  const pad = (num: number): string => String(num).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Formats a dependency path array into a display string.
 */
export function formatDependencyPath(path?: string[]): string {
  if (!path || path.length === 0) return "";
  return path.join(" -> ");
}

/**
 * Escapes a value for safe inclusion in a CSV file.
 * Wraps in quotes and escapes existing quotes.
 */
export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = "";
  if (typeof val === "object") {
    str = JSON.stringify(val);
  } else if (typeof val === "string") {
    str = val;
  } else if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") {
    str = String(val);
  } else if (typeof val === "symbol" || typeof val === "function") {
    str = val.toString();
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

/**
 * Truncates text to a specified length with an ellipsis.
 */
export function truncateText(text?: string, maxLength = 80): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
