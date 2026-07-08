import type { MsvgValidationIssue } from "../types.js";

function makeIssue(
  severity: MsvgValidationIssue["severity"],
  code: string,
  path: string,
  message: string,
  suggestion?: string,
): MsvgValidationIssue {
  const issue: MsvgValidationIssue = { severity, code, path, message };
  if (suggestion !== undefined) issue.suggestion = suggestion;
  return issue;
}

/** Build an error-severity validation issue. */
export function error(
  code: string,
  path: string,
  message: string,
  suggestion?: string,
): MsvgValidationIssue {
  return makeIssue("error", code, path, message, suggestion);
}

/** Build a warning-severity validation issue. */
export function warning(
  code: string,
  path: string,
  message: string,
  suggestion?: string,
): MsvgValidationIssue {
  return makeIssue("warning", code, path, message, suggestion);
}
