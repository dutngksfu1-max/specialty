"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { completeAssessment } from "@/application/assessment/completeAssessment";
import { getPartState } from "@/application/assessment/getPartState";
import { loadNickname } from "@/application/assessment/nickname";
import { resumeSession } from "@/application/assessment/resumeSession";
import { saveResponse } from "@/application/assessment/saveResponse";
import { startAssessment } from "@/application/assessment/startAssessment";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { AssessmentQuestion, ResponseOption } from "@/domain/assessment/model/definition";
import { AssessmentProgress, type SaveState } from "@/features/assessment-runner/AssessmentProgress";
import { QuestionCard } from "@/features/assessment-runner/QuestionCard";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import type { LocalArtwork } from "@/lib/assessmentPresentation";
import { messageFor } from "@/lib/errorMessages";

export interface AssessmentRunnerProps {
  readonly slug: string;
  readonly sectionOrder: number;
  readonly sectionCount: number;
  readonly sectionTitle: string;
  readonly sectionDescription?: string;
  readonly sectionArtwork?: LocalArtwork;
  readonly totalCount: number;
  readonly questions: readonly AssessmentQuestion[];
  readonly options: readonly ResponseOption[];
  readonly previousSectionOrder: number | null;
  readonly nextSectionOrder: number | null;
}

type Status = "loading" | "ready" | "no-session" | "outdated" | "unavailable";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function AssessmentRunner(props: AssessmentRunnerProps) {
  const {
    slug,
    sectionOrder,
    sectionCount,
    sectionTitle,
    sectionDescription,
    sectionArtwork,
    totalCount,
    questions,
    options,
    previousSectionOrder,
    nextSectionOrder,
  } = props;

  const router = useRouter();
  const services = useAssessmentServices();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>("loading");
  const [answers, setAnswers] = useState<ReadonlyMap<string, number>>(new Map());
  const answersRef = useRef<ReadonlyMap<string, number>>(new Map());
  const [answeredCount, setAnsweredCount] = useState(0);
  const [showUnanswered, setShowUnanswered] = useState(searchParams.get("missing") === "1");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [hasFailedSave, setHasFailedSave] = useState(false);

  const pendingSavesRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const failedSavesRef = useRef(
    new Map<string, { question: AssessmentQuestion; value: number; message: string }>(),
  );

  useEffect(() => {
    if (services === null) return;
    let alive = true;

    void getPartState(services.deps, { slug, sectionOrder }).then((result) => {
      if (!alive) return;
      if (result.ok) {
        const loaded = new Map<string, number>();
        result.value.answers.forEach((value, questionId) => loaded.set(String(questionId), value));
        answersRef.current = loaded;
        setAnswers(loaded);
        setAnsweredCount(result.value.answeredCount);
        setStatus("ready");
        setSaveState("saved");
        return;
      }
      if (result.error.code === "SESSION_NOT_FOUND") setStatus("no-session");
      else if (result.error.code === "VERSION_MISMATCH") setStatus("outdated");
      else setStatus("unavailable");
      setSaveState("error");
    });

    return () => {
      alive = false;
    };
  }, [services, slug, sectionOrder]);

  const focusFirstMissing = useCallback(() => {
    const missing = questions.find((question) => !answersRef.current.has(String(question.id)));
    if (missing === undefined) return;
    const element = document.getElementById(`q-${String(missing.id)}`);
    element?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    element?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus({ preventScroll: true });
  }, [questions]);

  useEffect(() => {
    if (status === "ready" && showUnanswered) focusFirstMissing();
  }, [focusFirstMissing, showUnanswered, status]);

  function enqueueSave(question: AssessmentQuestion, value: number) {
    if (services === null) return;
    pendingSavesRef.current += 1;
    setSaveState("saving");
    setSaveError(null);

    const task = saveQueueRef.current.then(async () => {
      try {
        const saved = await saveResponse(services.deps, { slug, questionId: question.id, value });
        if (!saved.ok) {
          const message = messageFor(saved.error).body;
          failedSavesRef.current.set(String(question.id), { question, value, message });
          setHasFailedSave(true);
          setSaveError(message);
        } else {
          failedSavesRef.current.delete(String(question.id));
          setHasFailedSave(failedSavesRef.current.size > 0);
        }
      } catch {
        const message = "응답을 저장하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.";
        failedSavesRef.current.set(String(question.id), { question, value, message });
        setHasFailedSave(true);
        setSaveError(message);
      } finally {
        pendingSavesRef.current -= 1;
        if (pendingSavesRef.current === 0) {
          const remainingFailure = failedSavesRef.current.values().next().value as
            | { readonly message: string }
            | undefined;
          setSaveState(remainingFailure === undefined ? "saved" : "error");
          setSaveError(remainingFailure?.message ?? null);
        }
      }
    });

    saveQueueRef.current = task;
  }

  function handleSelect(question: AssessmentQuestion, value: number) {
    const key = String(question.id);
    const previous = answersRef.current;
    const isNew = !previous.has(key);
    const next = new Map(previous).set(key, value);
    answersRef.current = next;
    setAnswers(next);
    if (isNew) setAnsweredCount((count) => count + 1);
    enqueueSave(question, value);
  }

  async function flushSaves(): Promise<boolean> {
    await saveQueueRef.current;
    if (failedSavesRef.current.size > 0) {
      setSaveState("error");
      return false;
    }
    return true;
  }

  async function retryFailedSave() {
    if (services === null) return;
    const failed = [...failedSavesRef.current.values()];
    if (failed.length === 0) return;
    failedSavesRef.current.clear();
    setHasFailedSave(false);
    for (const item of failed) enqueueSave(item.question, item.value);
    await saveQueueRef.current;
  }

  const unansweredInPart = questions.filter((question) => !answers.has(String(question.id)));

  async function navigate(path: string): Promise<boolean> {
    setSubmitting(true);
    const safe = await flushSaves();
    if (!safe) {
      setSubmitting(false);
      return false;
    }
    router.push(path);
    return true;
  }

  async function goToNext() {
    if (unansweredInPart.length > 0) {
      setShowUnanswered(true);
      focusFirstMissing();
      return;
    }
    if (nextSectionOrder !== null) await navigate(`/assessments/${slug}/run/${nextSectionOrder}`);
  }

  async function finish() {
    if (services === null) return;
    if (unansweredInPart.length > 0) {
      setShowUnanswered(true);
      focusFirstMissing();
      return;
    }

    setSubmitting(true);
    if (!(await flushSaves())) {
      setSubmitting(false);
      return;
    }

    const completed = await completeAssessment(services.deps, { slug });
    if (completed.ok) {
      router.push(`/assessments/${slug}/result`);
      return;
    }

    if (completed.error.code === "INCOMPLETE_RESPONSES") {
      const resumed = await resumeSession(services.deps, { slug });
      setSubmitting(false);
      if (resumed.ok && resumed.value.unanswered.length > 0) {
        router.push(`/assessments/${slug}/run/${resumed.value.nextSectionOrder}?missing=1`);
        return;
      }
    }
    setSaveError(messageFor(completed.error).body);
    setSubmitting(false);
  }

  async function restart(): Promise<boolean> {
    if (services === null || !(await flushSaves())) return false;
    const remembered = await loadNickname(services);
    const started = await startAssessment(services.deps, {
      slug,
      nickname: remembered.ok ? remembered.value : "",
      restart: true,
    });
    if (!started.ok) {
      setSaveError(messageFor(started.error).body);
      return false;
    }
    const firstSection = [...started.value.definition.sections].sort((a, b) => a.order - b.order)[0];
    router.replace(`/assessments/${slug}/run/${firstSection?.order ?? 1}`);
    return true;
  }

  if (status === "no-session" || status === "outdated" || status === "unavailable") {
    const code = status === "no-session" ? "SESSION_NOT_FOUND" : status === "outdated" ? "VERSION_MISMATCH" : "ASSESSMENT_NOT_FOUND";
    const message = messageFor({ code });
    return (
      <main id="main" className="mx-auto min-h-dvh max-w-(--container-survey) px-4 py-16 sm:px-6">
        <h1 className="text-h1 text-foreground">{message.title}</h1>
        <p className="mt-3 text-body text-foreground-muted">{message.body}</p>
        <Link href={`/assessments/${slug}`} className={buttonClasses("primary", "md", "mt-8")}>검사 소개로 가기</Link>
      </main>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30">
        <AssessmentProgress
          slug={slug}
          sectionOrder={sectionOrder}
          sectionCount={sectionCount}
          answeredCount={answeredCount}
          totalCount={totalCount}
          saveState={saveState}
          menuDisabled={status !== "ready" || submitting}
          onPause={() => navigate(`/assessments/${slug}`)}
          onHome={() => navigate("/")}
          onRestart={restart}
        />
      </div>

      <main id="main" className="mx-auto max-w-(--container-survey) px-4 pt-6 pb-36 sm:px-6 sm:pt-10">
        <section className="assessment-card assessment-card-deck relative overflow-hidden p-5 sm:p-6">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary-soft-border" />
          <div className="flex items-start justify-between gap-4 sm:gap-6">
            <div className="min-w-0">
              <p className="text-caption font-bold tracking-[0.08em] text-accent">
                챕터 <span className="tabular-nums">{String(sectionOrder).padStart(2, "0")}</span>
              </p>
              <h1 className="mt-2 text-h1 text-foreground sm:text-h1-lg">{sectionTitle}</h1>
              {sectionDescription !== undefined && <p className="mt-3 text-body-sm text-foreground-muted sm:text-body">{sectionDescription}</p>}
            </div>
            {sectionArtwork !== undefined && (
              <Image src={sectionArtwork.src} width={sectionArtwork.width} height={sectionArtwork.height} alt="" aria-hidden className="h-auto w-20 shrink-0 sm:w-28" />
            )}
          </div>

        </section>

        <div className="min-h-7 pt-4" aria-live="polite">
          {showUnanswered && unansweredInPart.length > 0 && (
            <p className="flex items-center gap-2 text-body-sm font-semibold text-status-danger"><Icon name="warning" />답하지 않은 문항이 {unansweredInPart.length}개 있어요.</p>
          )}
          {saveError !== null && (
            <div className="flex flex-wrap items-center gap-3 text-body-sm text-status-danger">
              <p className="flex items-center gap-2"><Icon name="warning" />{saveError}</p>
              {hasFailedSave && <Button variant="secondary" size="sm" onClick={() => void retryFailedSave()}>다시 저장</Button>}
            </div>
          )}
        </div>

        <ol className="mt-4 flex flex-col gap-6 sm:gap-7">
          {questions.map((question) => (
            <QuestionCard
              key={String(question.id)}
              question={question}
              options={options}
              value={answers.get(String(question.id))}
              highlightUnanswered={showUnanswered}
              onSelect={(value) => handleSelect(question, value)}
            />
          ))}
        </ol>
      </main>

      <div className="mobile-safe-action fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 shadow-elev-1">
        <div className="mx-auto flex max-w-(--container-survey) gap-2 sm:px-2">
          {previousSectionOrder !== null && (
            <Button variant="secondary" size="md" className="flex-1" disabled={submitting} onClick={() => void navigate(`/assessments/${slug}/run/${previousSectionOrder}`)}>
              <Icon name="arrow-left" /> 이전으로
            </Button>
          )}
          {nextSectionOrder !== null ? (
            <Button variant="primary" size="md" className="flex-[1.4]" disabled={submitting || status !== "ready"} onClick={() => void goToNext()}>
              {submitting ? "저장 확인 중…" : "다음으로"} {!submitting && <Icon name="arrow-right" />}
            </Button>
          ) : (
            <Button variant="primary" size="md" className="flex-[1.4]" disabled={submitting || status !== "ready"} aria-busy={submitting} onClick={() => void finish()}>
              {submitting ? "확인 중이에요…" : "결과 확인하기"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
