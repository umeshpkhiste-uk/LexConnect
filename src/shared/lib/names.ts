const TITLES = /^(adv(ocate)?|mr|mrs|ms|miss|dr|shri|shree|smt|kum|sri|sh|prof|justice|hon)\.?$/i;

/** First given name for greetings: skips titles like "Adv.", "Dr.", "Smt."
 * ("Adv. Umesh Khiste" → "Umesh"). Empty when there's no real name. */
export function firstName(fullName: string | null | undefined): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return words.find((w) => !TITLES.test(w)) ?? "";
}

/** Time-of-day greeting for the given moment. */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}
