const PREFIX = /^[A-Z][A-Z0-9]{0,7}$/;
const NUMBER = /^([A-Z][A-Z0-9]{0,7})-(\d{4})-(\d+)$/;

export class NumberingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NumberingError";
  }
}

export function assertPrefix(prefix: string): string {
  if (!PREFIX.test(prefix)) {
    throw new NumberingError("Prefix must be 1–8 letters or digits, starting with a letter");
  }
  return prefix;
}

export function formatDocumentNumber(
  prefix: string,
  year: number,
  sequence: number,
  width = 4,
): string {
  assertPrefix(prefix);
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new NumberingError("Year is out of range");
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new NumberingError("Sequence must start at 1");
  }
  if (!Number.isInteger(width) || width < 1 || width > 8) {
    throw new NumberingError("Number width must be from 1 to 8");
  }
  return `${prefix}-${year}-${String(sequence).padStart(width, "0")}`;
}

export function parseDocumentNumber(
  value: string,
): { prefix: string; year: number; sequence: number } | null {
  const match = NUMBER.exec(value);
  if (!match) return null;
  return {
    prefix: match[1],
    year: Number(match[2]),
    sequence: Number(match[3]),
  };
}

/** Next sequence for this prefix and year. Other years and prefixes are ignored. */
export function nextSequence(
  existing: readonly string[],
  prefix: string,
  year: number,
): number {
  assertPrefix(prefix);
  let max = 0;
  for (const value of existing) {
    const parsed = parseDocumentNumber(value);
    if (!parsed) continue;
    if (parsed.prefix === prefix && parsed.year === year) {
      max = Math.max(max, parsed.sequence);
    }
  }
  return max + 1;
}
