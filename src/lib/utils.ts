/**
 * Type guard to check if a value is a Record<string, string>.
 */
export function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(v => typeof v === 'string')
  );
}
