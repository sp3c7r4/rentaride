import { describe, expect, it } from "vitest";
import {
  hashPassword,
  hmac,
  safeEqual,
  sign,
  sixDigitCode,
  unsign,
  verifyPassword,
} from "@/server/auth/crypto";
import { maskEmail } from "@/server/services/auth";

describe("signed cookie values", () => {
  it("round-trips a value", () => {
    expect(unsign(sign("usr_abc123"))).toBe("usr_abc123");
  });

  it("rejects a tampered value or signature", () => {
    const signed = sign("usr_abc123");
    const [, sig] = signed.split(".");
    expect(unsign(`usr_other.${sig}`)).toBeNull();
    expect(unsign(`${signed.slice(0, -1)}0`)).toBeNull();
    expect(unsign("usr_abc123")).toBeNull();
    expect(unsign(undefined)).toBeNull();
  });
});

describe("codes and hashing", () => {
  it("makes 6-digit codes, including leading zeros", () => {
    for (let i = 0; i < 200; i++) expect(sixDigitCode()).toMatch(/^\d{6}$/);
  });

  it("keys code hashes with AUTH_SECRET", () => {
    expect(hmac("email_verify:usr_1:123456")).toHaveLength(64);
    expect(hmac("a")).not.toBe(hmac("b"));
  });

  it("compares in constant time and handles different lengths", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("verifies argon2 passwords and fails closed", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(stored, "correct horse")).toBe(true);
    expect(await verifyPassword(stored, "wrong")).toBe(false);
    // Unknown email: still runs a verify, returns false.
    expect(await verifyPassword(null, "anything")).toBe(false);
  });
});

describe("maskEmail", () => {
  it("keeps the first two characters and the domain", () => {
    expect(maskEmail("femi.adebayo@example.com")).toBe(
      "fe••••••••••@example.com",
    );
    expect(maskEmail("ab@x.ng")).toBe("ab••@x.ng");
  });
});
