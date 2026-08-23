"use client";

import { useEffect, useId, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  loadCharacterGender,
  saveCharacterGender,
} from "@/application/assessment/characterGender";
import { loadNickname, saveNickname } from "@/application/assessment/nickname";
import type { CharacterGender } from "@/domain/assessment/session/characterGender";
import { NICKNAME_MAX_LENGTH } from "@/domain/assessment/session/nickname";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";

/**
 * 닉네임 입력 (DEC-009, docs/design.md 9장)
 *
 * 로그인처럼 보이면 안 되므로 카드로 감싸지 않고 인라인 폼으로 둡니다.
 * 선택 입력이라 필수 표시(*) 대신 "(선택)"을 라벨에 붙입니다.
 */
export function NicknameEntry() {
  const services = useAssessmentServices();
  const inputId = useId();
  const helperId = useId();
  const genderLegendId = useId();

  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [characterGender, setCharacterGender] = useState<CharacterGender | null>(null);

  useEffect(() => {
    if (services === null) return;
    let alive = true;
    void Promise.all([loadNickname(services), loadCharacterGender(services)]).then(
      ([nicknameResult, genderResult]) => {
        if (!alive) return;
        if (nicknameResult.ok) setValue(nicknameResult.value);
        if (genderResult.ok) setCharacterGender(genderResult.value);
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

  return (
    <section className="w-full">
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(12rem,0.65fr)]">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor={inputId} className="block text-label text-foreground-body">
              닉네임을 입력해주세요.
            </label>
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
            aria-describedby={helperId}
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

        <fieldset className="min-w-0" aria-labelledby={genderLegendId}>
          <div className="flex items-center justify-between gap-3">
            <legend id={genderLegendId} className="text-label text-foreground-body">
              캐릭터 성별
            </legend>
            <span className="rounded-xs border border-accent-soft bg-accent-soft px-2 py-1 text-caption text-accent">
              필수
            </span>
          </div>
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
      </div>

      <p id={helperId} className="mt-2 flex items-start gap-2 text-caption text-foreground-muted">
        <Icon name="lock" className="mt-0.5 size-3.5 text-primary" />
        닉네임은 비우면 &lsquo;선생님&rsquo;으로 표시돼요. 성별은 결과 캐릭터에만 반영되며 둘 다 이 브라우저에만 저장돼요.
      </p>

      <p className="mt-1 min-h-5 text-caption text-status-success" aria-live="polite">
        {saved ? (
          <>
            <span aria-hidden="true">✓ </span>이 브라우저에 저장했어요.
          </>
        ) : null}
      </p>
    </section>
  );
}
