/** Narrows to a non-null, non-array plain object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UPPER_SNAKE_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/** camelCase: leading lowercase letter, then letters/digits (Section 32.2). */
export function isCamelCase(value: string): boolean {
  return CAMEL_CASE.test(value);
}

/** kebab-case: lowercase words joined by single hyphens (Section 7.1). */
export function isKebabCase(value: string): boolean {
  return KEBAB_CASE.test(value);
}

/** UPPER_SNAKE_CASE event names (Section 32.6). */
export function isUpperSnakeCase(value: string): boolean {
  return UPPER_SNAKE_CASE.test(value);
}
