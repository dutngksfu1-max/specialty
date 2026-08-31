"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getResult } from "@/application/assessment/getResult";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { AssessmentSignals } from "@/domain/assessment/result/signals";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { displayNickname } from "@/domain/assessment/session/nickname";
import { NicknameEditor } from "@/features/result/NicknameEditor";
import { ResultRenderer } from "@/features/result/ResultRenderer";
import { ResultShareCard } from "@/features/result/ResultShareCard";
import { RetakeControls } from "@/features/result/RetakeControls";
import { SaveImageButton } from "@/features/result/SaveImageButton";
import { SavePdfButton } from "@/features/result/SavePdfButton";
import { useAssessmentServices } from "@/features/shared/AssessmentRepositoryProvider";
import { messageFor, type ErrorMessage } from "@/lib/errorMessages";
import type { AssessmentPresentation } from "@/lib/assessmentPresentation";

interface Loaded {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly profile: ResultProfile;
  readonly signals?: AssessmentSignals;
}

type State =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly loaded: Loaded }
  | { readonly kind: "failed"; readonly message: ErrorMessage };

/**
 * 결과 화면 (PRD F-5)
 *
 * 저장된 데이터가 브라우저 안에만 있으므로 이 화면은 Client Component입니다.
 * 결과 키(resultKey)는 내부 식별자이므로 화면에 절대 출력하지 않습니다.
 */
export function ResultView({
  slug,
  presentation,
}: {
  readonly slug: string;
  readonly presentation?: AssessmentPresentation;
}) {
  const services = useAssessmentServices();
  /**
   * heroRef — 화면에 보이는 ResultHero의 header 요소를 가리킵니다.
   * PNG 이미지 저장과 PDF 다운로드 모두 이 ref를 사용합니다.
   */
  const heroRef = useRef<HTMLElement | null>(null);
  /**
   * shareCardRef — 화면 밖의 전용 캡처 카드 (SNS 공유 등에 향후 활용).
   * 현재 PNG 저장은 heroRef를 사용하므로, 이 ref는 ShareCard 유지 용도로만 남깁니다.
   */
  const shareCardRef = useRef<HTMLDivElement | null>(null);

  const [state, setState] = useState<State>({ kind: "loading" });
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    if (services === null) return;
    let alive = true;

    void getResult(services.deps, { slug }).then((result) => {
      if (!alive) return;

      if (result.ok) {
        setState({ kind: "ready", loaded: result.value });
        setNickname(displayNickname(result.value.snapshot.nickname));
        return;
      }
      setState({ kind: "failed", message: messageFor(result.error) });
    });

    return () => {
      alive = false;
    };
  }, [services, slug]);

  if (state.kind === "loading") {
    return (
      <main id="main" className="mx-auto max-w-(--container-survey) px-5 py-16 sm:px-6">
        <p className="text-body text-foreground-muted" aria-live="polite">
          결과를 불러오는 중이에요…
        </p>
      </main>
    );
  }

  if (state.kind === "failed") {
    return (
      <main id="main" className="mx-auto max-w-(--container-survey) px-5 py-16 sm:px-6">
        <h1 className="text-h1 text-foreground">{state.message.title}</h1>
        <p className="mt-3 text-body text-foreground-muted">{state.message.body}</p>
        <Link href={`/assessments/${slug}`} className={buttonClasses("primary", "md", "mt-8")}>
          검사 소개로 가기
        </Link>
      </main>
    );
  }

  const { definition, snapshot, profile, signals } = state.loaded;

  return (
    <>
      <main id="main" className="mx-auto max-w-(--container-landing) px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ResultRenderer
          definition={definition}
          snapshot={snapshot}
          profile={profile}
          nickname={nickname}
          signals={signals}
          presentation={presentation}
          heroRef={heroRef}
        />

        <section className="mt-10 rounded-lg border border-border bg-surface p-5 sm:p-6 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div>
            <p className="text-caption font-semibold text-primary-active">결과 보관</p>
            <h2 className="mt-2 text-h2 text-foreground sm:text-h2-lg">이 결과를 남겨 두세요</h2>
            <p className="mt-2 max-w-prose text-body-sm text-foreground-muted">
              이미지로 저장하면 오프라인에서도 다시 볼 수 있어요. 이름만 바꿔 저장해도 결과와 점수는 달라지지 않습니다.
            </p>
            <div className="mt-4">
              <NicknameEditor slug={slug} nickname={nickname} onChanged={setNickname} />
            </div>
          </div>

          {/* PDF 다운로드 → 이미지 저장 → 다시 검사 → 처음으로 순서 */}
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start lg:mt-0 lg:justify-end">
            <SavePdfButton heroRef={heroRef} nickname={nickname} />
            <SaveImageButton targetRef={heroRef} nickname={nickname} />
            <RetakeControls slug={slug} />
            <Link href="/" className={buttonClasses("ghost", "sm", "w-full sm:w-auto")}>
              <Icon name="home" /> 처음으로
            </Link>
          </div>
        </section>
      </main>

      {/* 화면 밖에서 대기하는 캡처용 카드. 향후 SNS 공유 등에 활용 가능합니다. */}
      <ResultShareCard
        ref={shareCardRef}
        definition={definition}
        snapshot={snapshot}
        profile={profile}
        nickname={nickname}
      />
    </>
  );
}
