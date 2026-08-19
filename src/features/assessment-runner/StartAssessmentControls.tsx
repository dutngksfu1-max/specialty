"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { loadNickname } from "@/application/assessment/nickname";
import { resumeSession } from "@/application/assessment/resumeSession";
import { startAssessment } from "@/application/assessment/startAssessment";
import { Button, buttonClasses } from "@/components/ui/Button";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor } from "@/lib/errorMessages";

type Existing =
  | { readonly kind: "unknown" }
  | { readonly kind: "none" }
  | { readonly kind: "inProgress"; readonly nextSectionOrder: number; readonly answered: number }
  | { readonly kind: "outdated" };

/**
 * 검사 시작 / 이어서 하기 (PRD F-1.7, DEC-010)
 *
 * 새로 시작하면 이전 응답이 지워지므로, 진행 중인 기록이 있을 때는 반드시 확인을 받습니다.
 */
export function StartAssessmentControls({ slug }: { readonly slug: string }) {
  const router = useRouter();
  const services = useAssessmentServices();

  const [existing, setExisting] = useState<Existing>({ kind: "unknown" });
  const [busy, setBusy] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
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
        });
        return;
      }
      setExisting(result.error.code === "VERSION_MISMATCH" ? { kind: "outdated" } : { kind: "none" });
    });

    return () => {
      alive = false;
    };
  }, [services, slug]);

  async function begin(restart: boolean) {
    if (services === null) return;
    setBusy(true);
    setFailure(null);

    const remembered = await loadNickname(services);
    const nickname = remembered.ok ? remembered.value : "";

    const started = await startAssessment(services.deps, { slug, nickname, restart });
    if (!started.ok) {
      setFailure(messageFor(started.error).body);
      setBusy(false);
      return;
    }

    const firstSection = [...started.value.definition.sections].sort((a, b) => a.order - b.order)[0];
    router.push(`/assessments/${slug}/run/${firstSection === undefined ? 1 : firstSection.order}`);
  }

  const hasProgress = existing.kind === "inProgress" && existing.answered > 0;

  return (
    <div className="mt-8">
      {existing.kind === "outdated" && (
        <p className="mb-4 text-body-sm text-foreground-body" aria-live="polite">
          <span aria-hidden="true">⚠ </span>
          검사가 새 버전으로 업데이트되었어요. 정확한 결과를 위해 처음부터 다시 진행해 주세요.
        </p>
      )}

      {hasProgress && existing.kind === "inProgress" ? (
        <>
          <p className="mb-4 text-body-sm text-foreground-muted" aria-live="polite">
            진행 중인 기록이 있어요. {existing.answered}문항까지 답하셨습니다.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/assessments/${slug}/run/${existing.nextSectionOrder}`}
              className={buttonClasses("primary", "lg")}
            >
              이어서 하기
            </Link>

            {confirmingRestart ? null : (
              <Button variant="secondary" size="lg" onClick={() => setConfirmingRestart(true)}>
                처음부터 다시 하기
              </Button>
            )}
          </div>

          {confirmingRestart && (
            <div className="mt-4 flex flex-col gap-3 border border-border-strong bg-surface p-4 sm:flex-row sm:items-center">
              <p className="text-body-sm text-foreground-body">
                <span aria-hidden="true">⚠ </span>
                처음부터 다시 하면 지금까지의 응답이 지워져요. 계속할까요?
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => void begin(true)}
                >
                  다시 시작
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingRestart(false)}>
                  취소
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Button
          variant="primary"
          size="lg"
          disabled={services === null || busy || existing.kind === "unknown"}
          aria-busy={busy}
          onClick={() => void begin(existing.kind === "outdated")}
        >
          {busy ? "준비 중이에요…" : "검사 시작하기"}
        </Button>
      )}

      {failure !== null && (
        <p className="mt-4 text-body-sm text-status-danger" aria-live="polite">
          <span aria-hidden="true">⚠ </span>
          {failure}
        </p>
      )}
    </div>
  );
}
