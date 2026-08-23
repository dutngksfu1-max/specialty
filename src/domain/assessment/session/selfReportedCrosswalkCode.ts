const CODE_PATTERN = /^[EI][NS][TF][JP]$/;

export function normalizeSelfReportedCrosswalkCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^EINSFTJP]/g, "").slice(0, 4);
}

export function isSelfReportedCrosswalkCode(value: unknown): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value);
}
