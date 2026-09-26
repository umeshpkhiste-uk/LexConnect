/** Field validation and normalisation for Indian mobile numbers, PIN codes
 * and Bar Council enrolment numbers. */

/** Returns "+91 98765 43210" for a valid Indian mobile number, else null.
 * Accepts spaces/dashes and an optional +91, 91 or 0 prefix. */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function mobileError(input: string): string | null {
  if (!input.trim()) return null;
  return normalizeIndianMobile(input) ? null : "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9";
}

export function pincodeError(input: string): string | null {
  if (!input.trim()) return null;
  return /^[1-9]\d{5}$/.test(input.trim()) ? null : "PIN code must be 6 digits and can't start with 0";
}

/**
 * Bar Council enrolment numbers follow STATE-CODE/NUMBER/YEAR, e.g.
 * MAH/1234/2015, D/5678/2010, KAR/123/2018. Returns the tidied form
 * (upper-case, "/" separators) or null if it doesn't fit.
 */
export function normalizeEnrolment(input: string, now: Date = new Date()): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\s*[/\-\\ ]\s*/g, "/");
  const match = /^([A-Z]{1,5})\/?(\d{1,6})\/((?:19|20)\d{2})$/.exec(cleaned);
  if (!match) return null;
  const year = Number(match[3]);
  if (year < 1950 || year > now.getFullYear()) return null;
  return `${match[1]}/${match[2]}/${match[3]}`;
}

export function enrolmentError(input: string, now: Date = new Date()): string | null {
  if (!input.trim()) return null;
  return normalizeEnrolment(input, now) ? null : "Use the format STATE/NUMBER/YEAR, e.g. MAH/1234/2015";
}
