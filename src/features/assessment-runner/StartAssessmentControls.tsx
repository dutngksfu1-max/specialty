"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { loadCharacterGender } from "@/application/assessment/characterGender";
import { loadNickname } from "@/application/assessment/nickname";
import { loadSelfReportedCrosswalkCode } from "@/application/assessment/selfReportedCrosswalkCode";
import { resumeSession } from "@/application/assessment/resumeSession";
import { startAssessment } from "@/application/assessment/startAssessment";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Icon } from "@/components/ui/Icon";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor } from "@/lib/errorMessages";

type Existing =
  | { readonly kind: "unknown" }
  | { readonly kind: "none" }
  | {
      readonly kind: "inProgress";
      readonly nextSectionOrder: number;
      readonly answered: number;
      readonly hasCharacterGender: boolean;
    }
  | { readonly kind: "outdated" };

export function StartAssessmentControls({ slug }: { readonly slug: string }) {
  const router = useRouter();
  const services = useAssessmentServices();
  const [existing, setExisting] = useState<Existing>({ kind: "unknown" });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (services === null) return;
    let alive = true;
    void resumeSession(services.deps, { slug }).then((result) => {
      if (!alive) return;
      if (result.ok) {
        setExisting({
          kind: "inProgress",
          nextSectionOrder: result.value.nextSectionOrder,
          answered: result.value.responses.length,
          hasCharacterGender: result.value.session.characterGender !== null,
        });
        return;
      }
      setExisting(result.error.code === "VERSION_MISMATCH" ? { kind: "outdated" } : { kind: "none" });
    });
    return () => {
      alive = false;
    };
  }, [services, slug]);

  async function begin(restart: boolean): Promise<boolean> {
    if (services === null) return false;
    setBusy(true);
    setFailure(null);

    const [remembered, rememberedGender, rememberedSelfReportedCode] = await Promise.all([
      loadNickname(services),
      loadCharacterGender(services),
      loadSelfReportedCrosswalkCode(services),
    ]);
    if (!rememberedGender.ok) {
      setFailure(messageFor(rememberedGender.error).body);
      setBusy(false);
      return false;
    }
    if (rememberedGender.value === null) {
      setFailure("처음 화면의 닉네임 입력 옆에서 캐릭터 성별을 먼저 선택해 주세요.");
      setBusy(false);
      return false;
    }

    const nickname = remembered.ok ? remembered.value : "";
    const started = await startAssessment(services.deps, {
      slug,
      nickname,
      characterGender: rememberedGender.value,
      selfReportedCrosswalkCode: rememberedSelfReportedCode.ok
        ? rememberedSelfReportedCode.value
        : null,
      restart,
    });

    if (!started.ok) {
      setFailure(messageFor(started.error).body);
      setBusy(false);
      return false;
    }

    const firstSection = [...started.value.definition.sections].sort((a, b) => a.order - b.order)[0];
    router.push(`/assessments/${slug}/run/${firstSection === undefined ? 1 : firstSection.order}`);
    return true;
  }

  const hasProgress =
    existing.kind === "inProgress" &&
    existing.answered > 0 &&
    existing.hasCharacterGender;

  return (
    <div className="mobile-safe-action fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 pt-3 shadow-elev-1 md:static md:mt-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
      <div className="mx-auto max-w-5xl">
        {existing.kind === "outdated" && (
          <p className="mb-3 flex gap-2 text-body-sm text-foreground-body" aria-live="polite">
            <Icon name="warning" className="text-status-warning" />
            새 버전으로 바뀌어 처음부터 진행합니다.
          </p>
        )}

        {hasProgress && existing.kind === "inProgress" ? (
          <div className="flex flex-col gap-2 md:items-start">
            <p className="hidden text-body-sm text-foreground-muted md:block" aria-live="polite">
              {existing.answered}문항까지 이 브라우저에 저장되어 있어요.
            </p>
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2 sm:flex sm:gap-3">
              <Link
                href={`/assessments/${slug}/run/${existing.nextSectionOrder}`}
                className={buttonClasses("primary", "lg")}
              >
                이어서 하기 <Icon name="arrow-right" />
              </Link>
              <ConfirmationDialog
                triggerLabel="처음부터"
                triggerIcon="restart"
                triggerVariant="secondary"
                triggerSize="lg"
                title="처음부터 다시 할까요?"
                description="지금까지 고른 답이 지워지고 첫 챕터부터 시작합니다. 이 작업은 되돌릴 수 없어요."
                confirmLabel="응답 지우고 다시 시작"
                disabled={busy}
                onConfirm={() => begin(true)}
              />
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full md:w-auto"
            disabled={services === null || busy || existing.kind === "unknown"}
            aria-busy={busy}
            onClick={() => void begin(existing.kind === "outdated")}
          >
            {busy ? "준비 중이에요…" : "검사 시작하기"}
            {!busy && <Icon name="arrow-right" />}
          </Button>
        )}

        {failure !== null && (
          <p className="mt-2 flex gap-2 text-body-sm text-status-danger" aria-live="polite">
            <Icon name="warning" /> {failure}
          </p>
        )}
      </div>
    </div>
  );
}
