"use client";

import { useState } from "react";

import { clearAllData } from "@/application/assessment/resetAssessment";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Icon } from "@/components/ui/Icon";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor } from "@/lib/errorMessages";
import { BRAND_NAME, PRIVACY_NOTE } from "@/lib/siteCopy";

type DeleteState = "idle" | "done" | "failed";

/**
 * Footer — 개인정보 안내(DEC-029 초안) + 저장 데이터 수동 삭제(DEC-015)
 *
 * 삭제는 되돌릴 수 없으므로 접근성 Dialog에서 한 번 확인을 받습니다.
 */
export function SiteFooter() {
  const services = useAssessmentServices();
  const [state, setState] = useState<DeleteState>("idle");
  const [failure, setFailure] = useState<string | null>(null);

  async function handleDelete(): Promise<boolean> {
    if (services === null) return false;

    const cleared = await clearAllData(services.deps);
    if (!cleared.ok) {
      setFailure(messageFor(cleared.error).body);
      setState("failed");
      return false;
    }
    setState("done");
    return true;
  }

  return (
    <footer className="mt-20 border-t border-border bg-background">
      <div className="mx-auto max-w-(--container-landing) px-5 py-12 sm:px-6">
        <p className="max-w-prose text-body-sm text-foreground-muted">{PRIVACY_NOTE.long}</p>

        <div className="mt-6">
          {state !== "done" && (
            <ConfirmationDialog
              triggerLabel="이 브라우저의 내 기록 삭제"
              triggerIcon="restart"
              triggerVariant="destructive"
              triggerSize="sm"
              title="저장된 기록을 모두 지울까요?"
              description="닉네임·응답·결과가 이 브라우저에서 모두 지워지고 되돌릴 수 없어요."
              confirmLabel="모든 기록 삭제"
              disabled={services === null}
              onConfirm={handleDelete}
            />
          )}

          {state === "done" && (
            <p className="flex items-center gap-2 text-body-sm text-status-success" aria-live="polite">
              <Icon name="check" /> 저장된 기록을 모두 지웠어요.
            </p>
          )}

          {state === "failed" && (
            <p className="flex items-center gap-2 text-body-sm text-status-danger" aria-live="polite">
              <Icon name="warning" /> {failure}
            </p>
          )}
        </div>

        <p className="mt-8 text-caption text-foreground-subtle">{BRAND_NAME}</p>
      </div>
    </footer>
  );
}
