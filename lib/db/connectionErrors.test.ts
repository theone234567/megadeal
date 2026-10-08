import { describe, expect, it } from "vitest";
import { withoutValues } from "./connection";

describe("database errors in the logs", () => {
  it("keep what went wrong but not the values a rule refused", () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint "merchants_email_key"'), {
      code: "23505",
      constraint: "merchants_email_key",
      detail: "Key (lower(email))=(someone@example.nz) already exists.",
      where: "SQL function … someone@example.nz",
    });
    const cleaned = withoutValues(err) as typeof err;
    expect(cleaned.message).toContain("merchants_email_key");
    expect(cleaned.code).toBe("23505");
    expect(cleaned.constraint).toBe("merchants_email_key");
    expect(JSON.stringify({ ...cleaned, message: cleaned.message })).not.toContain("someone@example.nz");
  });
});
