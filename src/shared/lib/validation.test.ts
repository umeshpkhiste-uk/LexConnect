import {
  caseNumberError,
  enrolmentError,
  gstinError,
  mobileError,
  normalizeCaseNumber,
  normalizeEnrolment,
  normalizeGstin,
  normalizeIndianMobile,
  normalizePan,
  panError,
  pincodeError,
} from "./validation";

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

describe("normalizeCaseNumber", () => {
  const now = new Date(2026, 8, 26);

  it("tidies valid Indian court case numbers", () => {
    expect(normalizeCaseNumber("482/2024", now)).toBe("482/2024");
    expect(normalizeCaseNumber("CC/123/2024", now)).toBe("CC/123/2024");
    expect(normalizeCaseNumber("cc123 / 2024", now)).toBe("CC/123/2024");
    expect(normalizeCaseNumber(" 45 / 2023 ", now)).toBe("45/2023");
  });

  it("rejects random alphanumeric strings, bare numbers and impossible years", () => {
    expect(normalizeCaseNumber("ABCD1234", now)).toBeNull();
    expect(normalizeCaseNumber("123456", now)).toBeNull();
    expect(normalizeCaseNumber("482/1900", now)).toBeNull();
    expect(normalizeCaseNumber("482/2099", now)).toBeNull();
    expect(caseNumberError("XYZ", now)).not.toBeNull();
    expect(caseNumberError("", now)).toBeNull();
  });
});

describe("normalizeGstin", () => {
  it("accepts a well-formed GSTIN", () => {
    expect(normalizeGstin("27AAAAA0000A1Z5")).toBe("27AAAAA0000A1Z5");
    expect(normalizeGstin("27aaaaa0000a1z5")).toBe("27AAAAA0000A1Z5");
    expect(normalizeGstin(" 27 AAAAA0000A1Z5 ")).toBe("27AAAAA0000A1Z5");
  });

  it("rejects the wrong length or shape", () => {
    expect(normalizeGstin("12345")).toBeNull();
    expect(normalizeGstin("27AAAAA0000A1X5")).toBeNull();
    expect(gstinError("NOTAGSTIN")).not.toBeNull();
    expect(gstinError("")).toBeNull();
  });
});

describe("normalizePan", () => {
  it("accepts a well-formed PAN", () => {
    expect(normalizePan("ABCDE1234F")).toBe("ABCDE1234F");
    expect(normalizePan("abcde1234f")).toBe("ABCDE1234F");
    expect(normalizePan(" ABCDE 1234 F ")).toBe("ABCDE1234F");
  });

  it("rejects the wrong length or shape", () => {
    expect(normalizePan("1234567890")).toBeNull();
    expect(normalizePan("ABCDE12345")).toBeNull();
    expect(panError("NOTAPAN")).not.toBeNull();
    expect(panError("")).toBeNull();
  });
});
