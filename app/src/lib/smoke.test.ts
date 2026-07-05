import { describe, expect, it } from "vitest";
import { APP_NAME } from "./constants";

describe("application contract", () => {
  it("uses the approved product name", () => {
    expect(APP_NAME).toBe("Exam Moderation System");
  });
});
