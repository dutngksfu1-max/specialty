"use client";

import type {
  AssessmentQuestion,
  ResponseOption,
} from "@/domain/assessment/model/definition";
import { LikertScale } from "@/features/assessment-runner/LikertScale";
import { cn } from "@/lib/cn";

/**
 * 문항 하나 (docs/design.md 10.1)
 *
 * 카드로 감싸지 않고 여백으로 구분합니다 — "카드 안 카드" 금지.
 * 미응답 강조는 색만이 아니라 왼쪽 세로선 + 아이콘 + 문장으로 함께 알립니다.
 */
export function QuestionCard({
  question,
  options,
  value,
  highlightUnanswered,
  onSelect,
}: {
  readonly question: AssessmentQuestion;
  readonly options: readonly ResponseOption[];
  readonly value: number | undefined;
  readonly highlightUnanswered: boolean;
  readonly onSelect: (value: number) => void;
}) {
  const labelId = `question-${String(question.id)}`;
  const isMissing = highlightUnanswered && value === undefined;

  return (
    <li
      id={`q-${String(question.id)}`}
      className={cn("scroll-mt-32 list-none", isMissing && "border-l-4 border-status-warning pl-4")}
    >
      <p id={labelId} className="text-body-lg text-foreground-body sm:text-body-lg-desktop">
        <span className="mr-2 text-foreground-subtle tabular-nums">{question.order}.</span>
        {question.text}
      </p>

      {isMissing && (
        <p className="mt-1 text-caption text-foreground-muted">
          <span aria-hidden="true">⚠ </span>
          아직 답하지 않았어요
        </p>
      )}

      <div className="mt-4">
        <LikertScale
          name={`question-${String(question.id)}-scale`}
          labelledBy={labelId}
          options={options}
          value={value}
          onSelect={onSelect}
        />
      </div>
    </li>
  );
}
