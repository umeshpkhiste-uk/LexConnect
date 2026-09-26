import { forgotPasswordSchema, signInSchema, signUpSchema } from "./schemas";

describe("signUpSchema", () => {
  it("accepts a valid sign-up", () => {
    const result = signUpSchema.safeParse({
      fullName: "Rahul Sharma",
      email: "rahul@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password under 8 characters", () => {
    const result = signUpSchema.safeParse({ fullName: "Rahul Sharma", email: "rahul@example.com", password: "Pw1" });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no uppercase letter", () => {
    const result = signUpSchema.safeParse({
      fullName: "Rahul Sharma",
      email: "rahul@example.com",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no digit", () => {
    const result = signUpSchema.safeParse({
      fullName: "Rahul Sharma",
      email: "rahul@example.com",
      password: "Passwords",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({ fullName: "Rahul Sharma", email: "not-an-email", password: "Password1" });
    expect(result.success).toBe(false);
  });

  it("rejects a full name that is only whitespace", () => {
    const result = signUpSchema.safeParse({ fullName: "   ", email: "rahul@example.com", password: "Password1" });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts a valid sign-in", () => {
    const result = signInSchema.safeParse({ email: "rahul@example.com", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({ email: "rahul@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({ email: "nope", password: "anything" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "rahul@example.com" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "rahul@" }).success).toBe(false);
  });
});
