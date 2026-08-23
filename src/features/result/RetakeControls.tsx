"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { resetAssessment } from "@/application/assessment/resetAssessment";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Icon } from "@/components/ui/Icon";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor } from "@/lib/errorMessages";

export function RetakeControls({ slug }: { readonly slug: string }) {
  const router = useRouter();
  const services = useAssessmentServices();
  const [failure, setFailure] = useState<string | null>(null);

  async function retake(): Promise<boolean> {
    if (services === null) return false;
    setFailure(null);
    const reset = await resetAssessment(services.deps, { slug });
    if (!reset.ok) {
      setFailure(messageFor(reset.error).body);
      return false;
    }
    router.push(`/assessments/${slug}`);
    return true;
  }

  return (
    <div>
      <ConfirmationDialog
        triggerLabel="다시 검사하기"
        triggerIcon="restart"
        triggerVariant="secondary"
        triggerSize="sm"
        triggerClassName="w-full sm:w-auto"
        title="다시 검사할까요?"
        description="지금 결과와 응답이 지워지고 새로 시작합니다. 필요하다면 먼저 결과 이미지를 저장해 주세요."
        confirmLabel="결과 지우고 다시 검사"
        disabled={services === null}
        onConfirm={retake}
      />
      {failure !== null && (
        <p className="mt-2 flex items-center gap-2 text-body-sm text-status-danger" aria-live="polite">
          <Icon name="warning" /> {failure}
        </p>
      )}
    </div>
  );
}
