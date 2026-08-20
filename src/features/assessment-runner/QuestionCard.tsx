"use client";

import type { AssessmentQuestion, ResponseOption } from "@/domain/assessment/model/definition";
import { LikertScale } from "@/features/assessment-runner/LikertScale";
import { cn } from "@/lib/cn";

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
  const isMissing = highlightUnanswered && value === undefined;
  const errorId = `question-error-${String(question.id)}`;

  return (
    <li id={`q-${String(question.id)}`} className="scroll-mt-40 list-none">
      <fieldset
        role="radiogroup"
        aria-describedby={isMissing ? errorId : undefined}
        className={cn(
          "assessment-card assessment-card-deck min-w-0 overflow-hidden p-0 transition-[border-color,box-shadow] duration-(--motion-base) ease-out-soft",
          "border-border focus-within:border-primary-soft-border focus-within:shadow-elev-1",
          isMissing && "border-status-warning",
        )}
      >
        <legend className="float-left w-full px-4 pt-5 sm:px-6 sm:pt-6">
          <span className="flex w-full min-w-0 items-start gap-3 border-b border-border pb-5 text-body-lg text-foreground-body sm:text-body-lg-desktop">
            <span className="inline-flex min-w-8 shrink-0 items-center justify-center rounded-xs border border-primary-soft-border bg-primary-soft px-1.5 py-1 text-caption font-bold tabular-nums text-primary-active">
              {String(question.order).padStart(2, "0")}
            </span>
            <span className="min-w-0 pt-0.5">{question.text}</span>
          </span>
        </legend>

        <div className="clear-both px-2 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
          {isMissing && (
            <p id={errorId} className="mb-3 flex items-center gap-2 text-caption font-semibold text-status-danger">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-status-danger" />
              아직 답하지 않았어요.
            </p>
          )}
          <LikertScale
            name={`question-${String(question.id)}-scale`}
            options={options}
            value={value}
            onSelect={onSelect}
          />
        </div>
      </fieldset>
    </li>
  );
}
