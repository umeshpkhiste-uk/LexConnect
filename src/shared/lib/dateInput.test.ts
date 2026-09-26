import { fromDateOnly, toDateOnly } from "./dateInput";

describe("toDateOnly / fromDateOnly", () => {
  it("round-trips a local date", () => {
    const date = new Date(2026, 8, 24);
    expect(toDateOnly(date)).toBe("2026-09-24");
    expect(fromDateOnly("2026-09-24")?.getTime()).toBe(date.getTime());
  });

  it("uses local date components, not UTC", () => {
    // 00:30 local is still the previous day in UTC for IST (UTC+5:30).
    expect(toDateOnly(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
  });

  it("handles empty values", () => {
    expect(toDateOnly(null)).toBeNull();
    expect(fromDateOnly(null)).toBeNull();
    expect(fromDateOnly("not a date")).toBeNull();
  });

  it("accepts timestamps by reading only the date part", () => {
    expect(toDateOnly(fromDateOnly("2026-03-05T10:00:00Z"))).toBe("2026-03-05");
  });
});
