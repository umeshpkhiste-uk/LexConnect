export type LockMethod = "pin" | "pattern";

/** PINs are always exactly this many digits. */
export const PIN_LENGTH = 6;
export const PATTERN_MIN_DOTS = 4;
/** Wrong PIN / pattern tries allowed before the app locks. */
export const MAX_ATTEMPTS = 3;

export function pinError(pin: string): string | null {
  if (!/^\d+$/.test(pin)) return "PIN can only contain digits";
  if (pin.length !== PIN_LENGTH) return `PIN must be ${PIN_LENGTH} digits`;
  if (/^(\d)\1+$/.test(pin)) return "Avoid a PIN of one repeated digit";
  if ("0123456789".includes(pin) || "9876543210".includes(pin)) return "Avoid a simple sequence like 123456";
  return null;
}

/** Pattern = the order of dots touched on a 3×3 grid (0–8), each once. */
export function encodePattern(dots: number[]): string {
  return dots.join("-");
}

export function patternError(dots: number[]): string | null {
  if (new Set(dots).size !== dots.length || dots.some((d) => d < 0 || d > 8)) return "Invalid pattern";
  if (dots.length < PATTERN_MIN_DOTS) return `Connect at least ${PATTERN_MIN_DOTS} dots`;
  return null;
}
