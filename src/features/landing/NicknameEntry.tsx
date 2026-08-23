"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  loadCharacterGender,
  saveCharacterGender,
} from "@/application/assessment/characterGender";
import { loadNickname, saveNickname } from "@/application/assessment/nickname";
import {
  loadSelfReportedCrosswalkCode,
  updateSelfReportedCrosswalkCode,
} from "@/application/assessment/selfReportedCrosswalkCode";
import type { TypeCodeSpec } from "@/domain/assessment/model/definition";
import type { CharacterGender } from "@/domain/assessment/session/characterGender";
import { NICKNAME_MAX_LENGTH } from "@/domain/assessment/session/nickname";
import {
  isSelfReportedCrosswalkCode,
  normalizeSelfReportedCrosswalkCode,
} from "@/domain/assessment/session/selfReportedCrosswalkCode";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { useLandingEntryAction } from "@/features/landing/LandingEntryAction";

const CROSSWALK_EXAMPLE = ["E", "N", "T", "J"].join("");

function HelpTooltip({
  label,
  children,
  align = "center",
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly align?: "left" | "center" | "right";
}) {
  const tooltipId = useId();
  const position =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span className="group relative z-30 inline-flex shrink-0 hover:z-50 focus-within:z-50">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="relative grid size-6 place-items-center rounded-xs text-foreground-subtle after:absolute after:-inset-2.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <Icon name="help" className="size-4" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-50 mb-2 hidden w-60 rounded-sm border border-border-strong bg-surface px-3 py-2 text-caption font-medium text-foreground-body opacity-100 shadow-elev-1 group-hover:block group-focus-within:block ${position}`}
      >
        {children}
      </span>
    </span>
  );
}

/**
 * 닉네임 입력 (DEC-009, docs/design.md 9장)
 *
 * 로그인처럼 보이면 안 되므로 카드로 감싸지 않고 인라인 폼으로 둡니다.
 * 선택 입력이라 필수 표시(*) 대신 "(선택)"을 라벨에 붙입니다.
 */
export function NicknameEntry({
  crosswalk,
  slug,
}: {
  readonly crosswalk?: NonNullable<TypeCodeSpec["crosswalk"]>;
  readonly slug?: string;
}) {
  const services = useAssessmentServices();
  const entryAction = useLandingEntryAction();
  const inputId = useId();
  const genderLegendId = useId();
  const selfReportedInputId = useId();
  const selfReportedHintId = useId();

  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [characterGender, setCharacterGender] = useState<CharacterGender | null>(null);
  const [selfReportedCode, setSelfReportedCode] = useState("");
  const [selfReportedError, setSelfReportedError] = useState(false);

  useEffect(() => {
    if (services === null) return;
    let alive = true;
    void Promise.all([
      loadNickname(services),
      loadCharacterGender(services),
      loadSelfReportedCrosswalkCode(services),
    ]).then(
      ([nicknameResult, genderResult, selfReportedResult]) => {
        if (!alive) return;
        if (nicknameResult.ok) setValue(nicknameResult.value);
        if (genderResult.ok) setCharacterGender(genderResult.value);
        if (selfReportedResult.ok) setSelfReportedCode(selfReportedResult.value ?? "");
      },
    );
    return () => {
      alive = false;
    };
  }, [services]);

  async function persist(next: string) {
    if (services === null) return;
    const result = await saveNickname(services, next);
    if (result.ok) {
      setValue(result.value);
      setSaved(result.value.length > 0);
    }
  }

  async function persistCharacterGender(next: CharacterGender) {
    if (services === null) return;
    setCharacterGender(next);
    const result = await saveCharacterGender(services, next);
    setSaved(result.ok);
  }

  async function persistSelfReportedCode(next: string) {
    if (services === null) return;
    const normalized = normalizeSelfReportedCrosswalkCode(next);
    const isValid = normalized.length === 0 || isSelfReportedCrosswalkCode(normalized);
    setSelfReportedError(!isValid);
    const result =
      slug === undefined
        ? null
        : await updateSelfReportedCrosswalkCode(
            { ...services.deps, preferences: services.preferences },
            { slug, raw: normalized },
          );
    if (!isValid) {
      setSaved(false);
      return;
    }
    if (result?.ok) {
      setSelfReportedCode(result.value ?? "");
      setSaved(true);
    }
  }

  return (
    <section className="w-full">
      <div className="min-w-0">
        <section className="min-w-0" aria-label="선택 정보">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <label htmlFor={inputId} className="block text-label text-foreground-body">
                    닉네임
                  </label>
                  <HelpTooltip label="닉네임 도움말" align="left">
                    닉네임을 비우면 &lsquo;선생님&rsquo;으로 표시되며 이 브라우저에만 저장돼요.
                  </HelpTooltip>
                </div>
                <span className="rounded-xs border border-border bg-background px-2 py-1 text-caption text-foreground-subtle">
                  선택
                </span>
              </div>

              <input
                id={inputId}
                name="nickname"
                type="text"
                inputMode="text"
                autoComplete="off"
                maxLength={NICKNAME_MAX_LENGTH}
                value={value}
                disabled={services === null}
                placeholder="예: 찰스쌤"
                onChange={(event) => {
                  setValue(event.target.value);
                  setSaved(false);
                }}
                onBlur={(event) => void persist(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void persist(value);
                  }
                }}
                className="mt-2 min-h-13 w-full rounded-sm border border-border-strong bg-background px-4 text-body text-foreground-body shadow-elev-1 placeholder:text-foreground-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:bg-surface-muted"
              />
            </div>

            {crosswalk !== undefined && (
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <label
                      htmlFor={selfReportedInputId}
                      className="block text-label text-foreground-body"
                    >
                      {crosswalk.selfReportedInputLabel}
                    </label>
                    <HelpTooltip label="코드 입력 도움말" align="right">
                      모르면 비워 두셔도 괜찮아요. 결과에서 교직 코드와 나란히 보여 드려요.
                    </HelpTooltip>
                  </div>
                  <span className="rounded-xs border border-border bg-background px-2 py-1 text-caption text-foreground-subtle">
                    선택
                  </span>
                </div>
                <input
                  id={selfReportedInputId}
                  name="selfReportedCrosswalkCode"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={4}
                  value={selfReportedCode}
                  aria-describedby={selfReportedError ? selfReportedHintId : undefined}
                  aria-invalid={selfReportedError}
                  disabled={services === null}
                  placeholder={`예: ${CROSSWALK_EXAMPLE}`}
                  onChange={(event) => {
                    setSelfReportedCode(normalizeSelfReportedCrosswalkCode(event.target.value));
                    setSelfReportedError(false);
                    setSaved(false);
                  }}
                  onBlur={(event) => void persistSelfReportedCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void persistSelfReportedCode(selfReportedCode);
                    }
                  }}
                  className="mt-2 min-h-13 w-full rounded-sm border border-border-strong bg-background px-4 text-center text-body font-bold uppercase tracking-widest text-foreground-body shadow-elev-1 placeholder:text-caption placeholder:font-normal placeholder:tracking-normal placeholder:text-foreground-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:bg-surface-muted"
                />
                {selfReportedError && (
                  <p id={selfReportedHintId} className="mt-2 text-caption text-status-danger">
                    네 글자를 모두 입력해 주세요.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 min-w-0 border-t border-border pt-5">
          <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.78fr)] sm:items-end">
            <fieldset className="min-w-0" aria-labelledby={genderLegendId}>
              <legend id={genderLegendId} className="w-full text-label text-foreground-body">
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1">
                    성별
                    <HelpTooltip label="성별 도움말" align="left">
                      성별은 결과 캐릭터에만 반영되며 이 브라우저에만 저장돼요.
                    </HelpTooltip>
                  </span>
                  <span className="rounded-xs border border-accent-soft bg-accent-soft px-2 py-1 text-caption font-normal text-accent">
                    필수
                  </span>
                </span>
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  ["male", "남성"],
                  ["female", "여성"],
                ] as const).map(([gender, label]) => (
                  <label key={gender} className="relative min-w-0 cursor-pointer">
                    <input
                      type="radio"
                      name="characterGender"
                      value={gender}
                      checked={characterGender === gender}
                      disabled={services === null}
                      onChange={() => void persistCharacterGender(gender)}
                      className="peer sr-only"
                    />
                    <span className="grid min-h-13 place-items-center rounded-sm border border-border-strong bg-background px-3 text-body-sm font-semibold text-foreground-body shadow-elev-1 peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-active peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring peer-disabled:cursor-not-allowed peer-disabled:bg-surface-muted">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {entryAction !== null && <div>{entryAction}</div>}
          </div>
        </section>
      </div>

      <p className="sr-only" aria-live="polite">
        {saved ? (
          <>
            <span aria-hidden="true">✓ </span>이 브라우저에 저장했어요.
          </>
        ) : null}
      </p>
    </section>
  );
}
