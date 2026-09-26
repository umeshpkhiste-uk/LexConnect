import { encodePattern, patternError, pinError } from "./rules";

describe("pinError", () => {
  it("accepts 6-digit PINs that aren't trivial", () => {
    expect(pinError("739164")).toBeNull();
    expect(pinError("258025")).toBeNull();
  });

  it("rejects other lengths, non-digits, repeats and sequences", () => {
    expect(pinError("2580")).not.toBeNull();
    expect(pinError("1234567")).not.toBeNull();
    expect(pinError("12a456")).not.toBeNull();
    expect(pinError("111111")).not.toBeNull();
    expect(pinError("123456")).not.toBeNull();
    expect(pinError("654321")).not.toBeNull();
  });
});

describe("patterns", () => {
  it("encodes dots in drawing order", () => {
    expect(encodePattern([0, 4, 8, 5])).toBe("0-4-8-5");
  });

  it("needs at least four distinct dots", () => {
    expect(patternError([0, 1, 2])).not.toBeNull();
    expect(patternError([0, 1, 1, 2])).not.toBeNull();
    expect(patternError([0, 1, 2, 5])).toBeNull();
  });
});
