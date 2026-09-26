import { firstName, greetingFor } from "./names";

describe("firstName", () => {
  it("skips honorifics", () => {
    expect(firstName("Adv. Umesh Khiste")).toBe("Umesh");
    expect(firstName("Advocate Priya Rao")).toBe("Priya");
    expect(firstName("Dr Ramesh Iyer")).toBe("Ramesh");
    expect(firstName("Smt. Kavita Joshi")).toBe("Kavita");
    expect(firstName("Umesh Khiste")).toBe("Umesh");
  });

  it("returns empty when there is no real name", () => {
    expect(firstName("Adv.")).toBe("");
    expect(firstName("")).toBe("");
    expect(firstName(null)).toBe("");
  });
});

describe("greetingFor", () => {
  const at = (h: number) => new Date(2026, 8, 26, h, 0);
  it("follows the time of day", () => {
    expect(greetingFor(at(6))).toBe("Good morning");
    expect(greetingFor(at(11))).toBe("Good morning");
    expect(greetingFor(at(12))).toBe("Good afternoon");
    expect(greetingFor(at(16))).toBe("Good afternoon");
    expect(greetingFor(at(17))).toBe("Good evening");
    expect(greetingFor(at(23))).toBe("Good evening");
    expect(greetingFor(at(2))).toBe("Good evening");
  });
});
