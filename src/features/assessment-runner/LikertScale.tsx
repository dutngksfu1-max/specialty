"use client";

import type { ResponseOption } from "@/domain/assessment/model/definition";

/**
 * LikertScale — docs/design.md 10.2 규격
 *
 * 핵심: **진짜 `<input type="radio">`**를 씁니다.
 * div + onClick으로 흉내 내면 키보드 화살표 이동과 스크린리더 안내가 전부 사라집니다.
 * 같은 `name`을 가진 네이티브 라디오는 브라우저가 알아서
 * ←/→/↑/↓ 이동, Space 선택, Tab 그룹 단위 이동을 처리해 줍니다.
 *
 * 선택 상태는 색 + 채워짐 + 체크 아이콘 세 가지로 동시에 표현합니다 (색만 금지).
 */
export function LikertScale({
  name,
  labelledBy,
  options,
  value,
  onSelect,
}: {
  readonly name: string;
  readonly labelledBy: string;
  readonly options: readonly ResponseOption[];
  readonly value: number | undefined;
  readonly onSelect: (value: number) => void;
}) {
  const first = options[0];
  const last = options[options.length - 1];

  return (
    <div>
      <div role="radiogroup" aria-labelledby={labelledBy} className="relative flex justify-between">
        {/* 원과 원을 잇는 배경 라인 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[21px] right-[22px] left-[22px] h-0.5 bg-surface-inset"
        />

        {options.map((option) => (
          <label
            key={option.value}
            className="relative z-10 flex cursor-pointer flex-col items-center"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onSelect(option.value)}
              aria-label={`${option.value}점, ${option.label}`}
              className="peer sr-only"
            />
            {/*
              터치 영역 44×44px.
              peer-* 변형은 `.peer`의 **형제**에만 적용되므로, 안쪽 원의 상태 변화도
              여기(형제)에서 자식 선택자로 지정합니다. 안쪽 span에 직접 붙이면 동작하지 않습니다.
            */}
            <span
              aria-hidden="true"
              className="grid h-11 w-11 place-items-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring peer-checked:[&_svg]:opacity-100 peer-checked:[&>span]:border-primary peer-checked:[&>span]:bg-primary"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-border-strong bg-surface transition-colors duration-[120ms] ease-out-soft">
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 opacity-0 transition-opacity duration-[120ms]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--color-primary-foreground)" }}
                >
                  <path d="M2.5 6.3 4.8 8.6 9.5 3.9" />
                </svg>
              </span>
            </span>
          </label>
        ))}
      </div>

      {/* 양 끝 라벨만 표시합니다 (DEC-018). 중간 값은 라디오의 aria-label로 전달됩니다. */}
      <div className="mt-1 flex justify-between gap-4 text-caption text-foreground-subtle">
        <span className="max-w-[8rem] text-left">{first?.visibleLabel ?? first?.label}</span>
        <span className="max-w-[8rem] text-right">{last?.visibleLabel ?? last?.label}</span>
      </div>
    </div>
  );
}
