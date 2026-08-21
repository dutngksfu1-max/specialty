/**
 * 본문 강조 (docs/design.md — 강조는 크기 → 여백 → 굵기 → 색 순서)
 *
 * 줄글이 한 가지 색으로만 이어지면 눈이 걸릴 곳이 없어 읽히지 않습니다.
 * 그렇다고 아무 데나 색을 칠하면 형광펜을 그은 문서가 되어 오히려 더 안 읽힙니다.
 *
 * 그래서 **무엇을 강조할지는 콘텐츠가 정하고**(`emphasisTerms`),
 * **몇 개까지 강조할지는 엔진이 막습니다**(`maxHighlights`).
 *
 * 이 검사는 축마다 전용 어휘를 쓰도록 콘텐츠 규칙이 강제하고 있어
 * (`realContent.test.ts`의 "축 간 어휘 누수" 검사),
 * 어휘 목록 하나를 모든 결과 문장에 함께 써도 축이 서로 섞이지 않습니다.
 *
 * 동기 순수 함수입니다 (AGENTS.md 2.2).
 */

export interface TextSegment {
  readonly text: string;
  /** true면 화면에서 강조합니다. */
  readonly emphasized: boolean;
}

/**
 * 한 문장에서 강조할 수 있는 최대 개수입니다.
 *
 * 셋을 넘기면 "어디가 중요한지"가 사라지고 배경색처럼 보입니다.
 * 강조는 나머지가 강조되지 않을 때만 강조로 읽힙니다.
 */
const DEFAULT_MAX_HIGHLIGHTS = 2;

interface Match {
  readonly start: number;
  readonly end: number;
}

/**
 * 본문을 강조 구간과 일반 구간으로 자릅니다.
 *
 * - 긴 어구를 먼저 잡습니다. "혼자 정리하는"이 "혼자"보다 우선합니다
 * - 겹치는 어구는 하나만 남깁니다
 * - 앞에서부터 `maxHighlights`개까지만 강조합니다
 * - 강조할 것이 없으면 통째로 한 조각을 돌려줍니다
 */
export function emphasizeText(
  text: string,
  terms: readonly string[],
  maxHighlights: number = DEFAULT_MAX_HIGHLIGHTS,
): readonly TextSegment[] {
  if (text.length === 0) return [];
  if (terms.length === 0 || maxHighlights <= 0) {
    return [{ text, emphasized: false }];
  }

  // 긴 어구부터 자리를 잡아야 짧은 어구가 긴 어구를 쪼개지 않습니다.
  const byLength = [...terms].sort((a, b) => b.length - a.length);
  const taken: Match[] = [];

  for (const term of byLength) {
    if (term.length === 0) continue;

    let from = 0;
    for (;;) {
      const start = text.indexOf(term, from);
      if (start === -1) break;
      const end = start + term.length;

      const overlaps = taken.some((match) => start < match.end && end > match.start);
      if (!overlaps) taken.push({ start, end });

      from = start + 1;
    }
  }

  if (taken.length === 0) return [{ text, emphasized: false }];

  // 문장 앞쪽을 우선합니다 — 먼저 읽는 곳에 강조가 있어야 시선을 잡습니다.
  const chosen = taken.sort((a, b) => a.start - b.start).slice(0, maxHighlights);

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of chosen) {
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), emphasized: false });
    }
    segments.push({ text: text.slice(match.start, match.end), emphasized: true });
    cursor = match.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), emphasized: false });
  }

  return segments;
}
