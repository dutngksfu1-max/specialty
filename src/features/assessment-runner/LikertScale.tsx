"use client";

import type { ResponseOption } from "@/domain/assessment/model/definition";

export function LikertScale({
  name,
  options,
  value,
  onSelect,
}: {
  readonly name: string;
  readonly options: readonly ResponseOption[];
  readonly value: number | undefined;
  readonly onSelect: (value: number) => void;
}) {
  return (
    <div className="relative grid min-w-0 grid-cols-5 gap-0 overflow-hidden rounded-md border border-primary-soft-border bg-primary-soft/20 p-1">
      <span aria-hidden="true" className="pointer-events-none absolute top-[2rem] right-[10%] left-[10%] h-px bg-primary-soft-border" />
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const selected = value === option.value;
        const visibleLabel = option.visibleLabel ?? option.label;
        const visualLines = splitLabelIntoTwoLines(visibleLabel);
        const distance = Math.abs(option.value - 3);
        const circleSizeClass = distance === 0 ? "size-5" : distance === 1 ? "size-6" : "size-7";
        return (
          <label key={option.value} htmlFor={id} className="relative z-1 min-w-0 cursor-pointer text-center">
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onSelect(option.value)}
              className="peer sr-only"
            />
            <span className={`flex min-h-24 min-w-0 flex-col items-center rounded-sm border px-0.5 py-1.5 transition-[background-color,border-color] duration-(--motion-fast) ease-out-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-focus-ring ${selected ? "border-primary-soft-border bg-primary-soft" : "border-transparent hover:bg-surface-inset"}`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-full">
                <span className={`grid ${circleSizeClass} place-items-center rounded-full border-2 transition-[background-color,border-color,transform] duration-(--motion-fast) ease-out-soft ${selected ? "scale-105 border-primary bg-primary" : "border-foreground-disabled bg-surface"}`}>
                  <IconCheck selected={selected} />
                </span>
              </span>
              <span aria-hidden="true" className={`mt-1.5 min-h-10 w-full min-w-0 text-body-sm leading-[1.35] tracking-[-0.04em] ${selected ? "font-bold text-primary-active" : "font-medium text-foreground-body"}`}>
                {visualLines.map((line, lineIndex) => (
                  <span key={`${line}-${lineIndex}`} className="block whitespace-nowrap">{line}</span>
                ))}
              </span>
              <span className="sr-only">{visibleLabel}</span>
              <span className={`mt-auto text-[0.6875rem] leading-4 font-semibold text-primary ${selected ? "visible" : "invisible"}`} aria-hidden={!selected}>
                선택
              </span>
              {selected && <span className="sr-only">선택됨</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function splitLabelIntoTwoLines(label: string): readonly string[] {
  const words = label.trim().split(/\s+/);
  if (words.length < 2) return [label];

  let splitAt = 1;
  let smallestLongestLine = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const longestLine = Math.max(first.length, second.length);
    if (longestLine < smallestLongestLine) {
      splitAt = index;
      smallestLongestLine = longestLine;
    }
  }

  return [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")];
}

function IconCheck({ selected }: { readonly selected: boolean }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-3 text-primary-foreground transition-opacity duration-(--motion-fast) ${selected ? "opacity-100" : "opacity-0"}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.3 4.8 8.6 9.5 3.9" />
    </svg>
  );
}
