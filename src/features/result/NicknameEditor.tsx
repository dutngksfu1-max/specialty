"use client";

import { useId, useState } from "react";

import { updateNickname } from "@/application/assessment/nickname";
import { Button } from "@/components/ui/Button";
import { NICKNAME_MAX_LENGTH } from "@/domain/assessment/session/nickname";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor } from "@/lib/errorMessages";

/**
 * 결과 화면에서 닉네임 고치기 (PRD F-2.4)
 *
 * 이름만 바뀝니다. 점수와 결과는 그대로입니다 — 이름은 채점과 무관합니다.
 */
export function NicknameEditor({
  slug,
  nickname,
  onChanged,
}: {
  readonly slug: string;
  readonly nickname: string;
  readonly onChanged: (nickname: string) => void;
}) {
  const services = useAssessmentServices();
  const inputId = useId();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nickname);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function submit() {
    if (services === null) return;
    setBusy(true);
    setFailure(null);

    const updated = await updateNickname({ ...services.deps, preferences: services.preferences }, {
      slug,
      nickname: draft,
    });

    if (!updated.ok) {
      setFailure(messageFor(updated.error).body);
      setBusy(false);
      return;
    }

    onChanged(updated.value);
    setBusy(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={services === null}
        onClick={() => {
          setDraft(nickname);
          setEditing(true);
        }}
      >
        이름 바꾸기
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-label text-foreground-body">
        어떻게 불러 드릴까요? (선택)
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          maxLength={NICKNAME_MAX_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submit();
            }
          }}
          className="h-11 w-full max-w-3xs rounded-sm border border-border bg-surface px-3 text-body text-foreground-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        />
        <Button variant="secondary" size="md" disabled={busy} onClick={() => void submit()}>
          저장
        </Button>
        <Button variant="ghost" size="md" onClick={() => setEditing(false)}>
          취소
        </Button>
      </div>

      {failure !== null && (
        <p className="text-body-sm text-status-danger" aria-live="polite">
          <span aria-hidden="true">⚠ </span>
          {failure}
        </p>
      )}
    </div>
  );
}
