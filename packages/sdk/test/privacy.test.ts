import { describe, expect, it } from "vitest";
import { sanitizeValue } from "../src/privacy";

describe("privacy sanitizer", () => {
  it("masks sensitive fields recursively", () => {
    expect(
      sanitizeValue({
        token: "abc",
        nested: {
          password: "secret",
          ok: "value"
        }
      })
    ).toEqual({
      token: "[masked]",
      nested: {
        password: "[masked]",
        ok: "value"
      }
    });
  });
});
