import { enrolmentError, mobileError, normalizeEnrolment, normalizeIndianMobile, pincodeError } from "./validation";

describe("normalizeIndianMobile", () => {
  it("accepts common ways of writing a mobile number", () => {
    expect(normalizeIndianMobile("9876543210")).toBe("+91 98765 43210");
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("+91 98765 43210");
    expect(normalizeIndianMobile("919876543210")).toBe("+91 98765 43210");
    expect(normalizeIndianMobile("09876543210")).toBe("+91 98765 43210");
    expect(normalizeIndianMobile("98765-43210")).toBe("+91 98765 43210");
  });

  it("rejects landlines, short numbers and bad prefixes", () => {
    expect(normalizeIndianMobile("1234567890")).toBeNull();
    expect(normalizeIndianMobile("98765")).toBeNull();
    expect(normalizeIndianMobile("5876543210")).toBeNull();
    expect(mobileError("12345")).not.toBeNull();
    expect(mobileError("")).toBeNull();
  });
});

describe("pincodeError", () => {
  it("allows six digits not starting with 0", () => {
    expect(pincodeError("400001")).toBeNull();
    expect(pincodeError("012345")).not.toBeNull();
    expect(pincodeError("4000")).not.toBeNull();
  });
});

describe("normalizeEnrolment", () => {
  const now = new Date(2026, 8, 26);

  it("tidies valid enrolment numbers", () => {
    expect(normalizeEnrolment("MAH/1234/2015", now)).toBe("MAH/1234/2015");
    expect(normalizeEnrolment("mah-1234-2015", now)).toBe("MAH/1234/2015");
    expect(normalizeEnrolment("D / 5678 / 2010", now)).toBe("D/5678/2010");
    expect(normalizeEnrolment("KAR123/2018", now)).toBe("KAR/123/2018");
  });

  it("rejects wrong shapes and impossible years", () => {
    expect(normalizeEnrolment("1234", now)).toBeNull();
    expect(normalizeEnrolment("MAH/1234/2030", now)).toBeNull();
    expect(normalizeEnrolment("MAH/1234/1900", now)).toBeNull();
    expect(enrolmentError("ABC", now)).not.toBeNull();
    expect(enrolmentError("", now)).toBeNull();
  });
});
