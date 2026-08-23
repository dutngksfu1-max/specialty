import { describe, expect, it } from "vitest";

import { resultViewHref } from "@/lib/resultViewHref";

/**
 * 결과 보기 갈래 주소 (DEC-062)
 *
 * 실제로 났던 사고를 막는 가드입니다. `history.replaceState`에 `URL` 객체를 넘겼더니
 * App Router가 그것을 서비스 워커로 postMessage 하면서 DataCloneError로 화면이 죽었습니다.
 * 주소 만들기를 순수 함수로 떼어 두고, **결과가 문자열인지**를 여기서 확인합니다.
 */
describe("결과 보기 갈래 주소", () => {
  const base = { pathname: "/assessments/teacher-style/result", search: "", hash: "" };

  it("문자열을 돌려줍니다 — URL 객체를 만들지 않습니다", () => {
    expect(typeof resultViewHref(base, "detail")).toBe("string");
  });

  it("자세히 보기는 주소에 남고, 요약으로 돌아오면 지웁니다", () => {
    const detail = resultViewHref(base, "detail");
    expect(detail).toBe("/assessments/teacher-style/result?view=detail");

    expect(resultViewHref({ ...base, search: "?view=detail" }, null)).toBe(
      "/assessments/teacher-style/result",
    );
  });

  it("다른 질의 문자열과 해시를 지웁니다는 뜻이 아닙니다", () => {
    const href = resultViewHref(
      { ...base, search: "?from=share", hash: "#result-scenes" },
      "detail",
    );

    expect(href).toContain("from=share");
    expect(href).toContain("view=detail");
    expect(href.endsWith("#result-scenes")).toBe(true);
  });

  it("같은 갈래를 다시 골라도 값이 늘어나지 않습니다", () => {
    const once = resultViewHref({ ...base, search: "?view=detail" }, "detail");

    expect(once).toBe("/assessments/teacher-style/result?view=detail");
  });
});
