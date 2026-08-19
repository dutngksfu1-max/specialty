"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { resetAssessment } from "@/application/assessment/resetAssessment";
import { Button } from "@/components/ui/Button";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor } from "@/lib/errorMessages";

/**
 * 다시 검사하기 (PRD F-5.5 / F-5.6, DEC-010)
 *
 * 최신 1개만 유지하므로 이전 결과는 사라집니다.
 * 되돌릴 수 없으니 반드시 한 번 확인을 받습니다. Modal은 쓰지 않습니다.
 */
export function RetakeControls({ slug }: { readonly slug: string }) {
  const router = useRouter();
  const services = useAssessmentServices();

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function retake() {
    if (services === null) return;
    setBusy(true);

    const reset = await resetAssessment(services.deps, { slug });
    if (!reset.ok) {
      setFailure(messageFor(reset.error).body);
      setBusy(false);
      return;
    }

    router.push(`/assessments/${slug}`);
  }

  if (!confirming) {
    return (
      <Button
        variant="secondary"
        size="lg"
        disabled={services === null}
        onClick={() => setConfirming(true)}
      >
        다시 검사하기
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 border border-border-strong bg-surface p-4">
      <p className="text-body-sm text-foreground-body">
        <span aria-hidden="true">⚠ </span>
        다시 검사하면 지금 결과와 응답이 지워지고 새로 시작해요. 이미지를 저장해 두셨나요?
      </p>
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" disabled={busy} onClick={() => void retake()}>
          {busy ? "정리하는 중이에요…" : "네, 다시 할게요"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
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
