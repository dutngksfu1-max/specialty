/**
 * 결과 보기 갈래(`?view=`)만 갈아 끼운 **상대 주소 문자열**을 만듭니다.
 *
 * 왜 문자열인가 — App Router는 `history.replaceState`를 가로채 서비스 워커로 넘깁니다.
 * 이때 `URL` 객체를 넘기면 structured clone 대상이 아니어서 브라우저가 이렇게 터집니다.
 *
 *   Failed to execute 'postMessage' on 'ServiceWorker': URL object could not be cloned
 *
 * 그래서 주소를 만드는 일만 여기서 하고, 호출부는 만들어진 문자열만 넘깁니다.
 * 동기 순수 함수입니다 (AGENTS.md 2.2).
 */
export function resultViewHref(
  location: { readonly pathname: string; readonly search: string; readonly hash: string },
  /** 기본값으로 돌아갈 때는 `null` — 주소에 흔적을 남기지 않습니다 */
  view: string | null,
): string {
  const params = new URLSearchParams(location.search);
  if (view === null) params.delete("view");
  else params.set("view", view);

  const query = params.toString();
  return `${location.pathname}${query === "" ? "" : `?${query}`}${location.hash}`;
}
