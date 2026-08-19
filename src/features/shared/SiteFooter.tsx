"use client";

import { useState } from "react";

import { clearAllData } from "@/application/assessment/resetAssessment";
import { Button } from "@/components/ui/Button";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor } from "@/lib/errorMessages";
import { BRAND_NAME, PRIVACY_NOTE } from "@/lib/siteCopy";

type DeleteState = "idle" | "confirming" | "working" | "done" | "failed";

/**
 * Footer — 개인정보 안내(DEC-029 초안) + 저장 데이터 수동 삭제(DEC-015)
 *
 * 삭제는 되돌릴 수 없으므로 한 번 확인을 받습니다. Modal은 쓰지 않습니다.
 */
export function SiteFooter() {
  const services = useAssessmentServices();
  const [state, setState] = useState<DeleteState>("idle");
  const [failure, setFailure] = useState<string | null>(null);

  async function handleDelete() {
    if (services === null) return;
    setState("working");

    const cleared = await clearAllData(services.deps);
    if (!cleared.ok) {
      setFailure(messageFor(cleared.error).body);
      setState("failed");
      return;
    }
    setState("done");
  }

  return (
    <footer className="mt-20 border-t border-border bg-background">
      <div className="mx-auto max-w-(--container-landing) px-5 py-12 sm:px-6">
        <p className="max-w-prose text-body-sm text-foreground-muted">{PRIVACY_NOTE.long}</p>

        <div className="mt-6">
          {state === "idle" && (
            <Button
              variant="destructive"
              size="sm"
              disabled={services === null}
              onClick={() => setState("confirming")}
            >
              <span aria-hidden="true">⌫</span>
              이 브라우저에 저장된 내 기록 삭제
            </Button>
          )}

          {state === "confirming" && (
            <div className="flex flex-col gap-3 border border-status-danger bg-surface p-4 sm:flex-row sm:items-center">
              <p className="text-body-sm text-foreground-body">
                <span aria-hidden="true">⚠ </span>
                닉네임·응답·결과가 모두 지워지고 되돌릴 수 없어요. 삭제할까요?
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="destructive" size="sm" onClick={() => void handleDelete()}>
                  삭제
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setState("idle")}>
                  취소
                </Button>
              </div>
            </div>
          )}

          {state === "working" && (
            <p className="text-body-sm text-foreground-muted" aria-live="polite">
              지우는 중이에요…
            </p>
          )}

          {state === "done" && (
            <p className="text-body-sm text-status-success" aria-live="polite">
              <span aria-hidden="true">✓ </span>
              저장된 기록을 모두 지웠어요.
            </p>
          )}

          {state === "failed" && (
            <p className="text-body-sm text-status-danger" aria-live="polite">
              <span aria-hidden="true">⚠ </span>
              {failure}
            </p>
          )}
        </div>

        <p className="mt-8 text-caption text-foreground-subtle">{BRAND_NAME}</p>
      </div>
    </footer>
  );
}
