import { describe, expect, it } from "vitest";

import {
  isSelfReportedCrosswalkCode,
  normalizeSelfReportedCrosswalkCode,
} from "@/domain/assessment/session/selfReportedCrosswalkCode";

describe("사용자 입력 비교 코드", () => {
  it("소문자와 공백을 정리하고 네 자리 형식을 확인합니다", () => {
    const code = ["i", "n", "f", "p"].join(" ");
    const normalized = normalizeSelfReportedCrosswalkCode(code);

    expect(normalized).toBe(["I", "N", "F", "P"].join(""));
    expect(isSelfReportedCrosswalkCode(normalized)).toBe(true);
  });

  it("덜 입력한 값은 완성된 코드로 보지 않습니다", () => {
    expect(isSelfReportedCrosswalkCode("IN".split("").join(""))).toBe(false);
  });
});
