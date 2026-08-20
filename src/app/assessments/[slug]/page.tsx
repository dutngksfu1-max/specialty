import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Accordion } from "@/components/ui/Accordion";
import { AssessmentTheme } from "@/components/ui/AssessmentTheme";
import { Icon } from "@/components/ui/Icon";
import {
  AnswerGuide,
  AssessmentMapPanel,
  ResultTakeaways,
} from "@/features/assessment-intro/AssessmentExplainer";
import { StartAssessmentControls } from "@/features/assessment-runner/StartAssessmentControls";
import { SiteFooter } from "@/features/shared/SiteFooter";
import { SiteHeader } from "@/features/shared/SiteHeader";
import { StorageNotice } from "@/features/shared/StorageNotice";
import { staticAssessmentCatalog } from "@/infrastructure/content/StaticAssessmentCatalog";
import { DISCLAIMER, PRIVACY_NOTE } from "@/lib/siteCopy";

export async function generateMetadata({
  params,
}: PageProps<"/assessments/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = staticAssessmentCatalog.findBySlug(slug);
  if (!found.ok) return { title: "검사를 찾을 수 없어요" };
  const definition = found.value;
  const url = `/assessments/${definition.slug}`;
  return {
    title: definition.title,
    description: definition.summary,
    alternates: { canonical: url },
    openGraph: { title: definition.title, description: definition.summary, url, type: "website", locale: "ko_KR" },
  };
}

export default async function AssessmentIntroPage({ params }: PageProps<"/assessments/[slug]">) {
  const { slug } = await params;
  const found = staticAssessmentCatalog.findBySlug(slug);
  if (!found.ok) notFound();

  const definition = found.value;
  const sections = [...definition.sections].sort((a, b) => a.order - b.order);
  const presentation = staticAssessmentCatalog.findPresentationBySlug(definition.slug);

  return (
    <AssessmentTheme presentation={presentation}>
      <SiteHeader />
      <StorageNotice />

      <main id="main" className="mx-auto max-w-5xl px-4 pt-4 pb-36 sm:px-6 md:pb-20 lg:px-8">
        <nav className="mb-6 text-body-sm">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-sm text-foreground-muted underline-offset-4 hover:text-primary-active hover:underline">
            <Icon name="arrow-left" /> 처음으로
          </Link>
        </nav>

        <section className="assessment-card grid min-w-0 grid-cols-1 overflow-hidden border-t-4 border-t-primary lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,1.1fr)]">
          <div className="min-w-0 p-5 sm:p-8 lg:p-10">
            <div className="flex items-center gap-3">
              <span className="rounded-xs border border-primary-soft-border bg-primary-soft px-2 py-1 text-caption font-bold tabular-nums text-primary-active">INTRO 01</span>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            </div>
            <p className="mt-7 text-label text-primary-active">강의에서 함께 읽는 나의 교직 리듬</p>
            <h1 className="mt-3 text-[2rem] leading-[1.2] font-bold tracking-[-0.025em] text-foreground sm:text-[2.6rem]">
              {definition.title}
            </h1>
            <p className="mt-4 max-w-prose text-body-lg text-foreground-muted">{definition.summary}</p>

            <dl className="mt-7 grid grid-cols-3 divide-x divide-border border-y border-border py-4">
              <div className="px-2 first:pl-0"><dt className="flex items-center gap-1 text-caption text-foreground-subtle"><Icon name="book" className="size-4" />문항</dt><dd className="mt-1 text-h3 tabular-nums text-foreground">{definition.questions.length}개</dd></div>
              <div className="px-3"><dt className="flex items-center gap-1 text-caption text-foreground-subtle"><Icon name="layers" className="size-4" />챕터</dt><dd className="mt-1 text-h3 tabular-nums text-foreground">{sections.length}개</dd></div>
              <div className="px-3 pr-0"><dt className="flex items-center gap-1 text-caption text-foreground-subtle"><Icon name="clock" className="size-4" />시간</dt><dd className="mt-1 text-h3 tabular-nums text-foreground">약 {definition.estimatedMinutes}분</dd></div>
            </dl>

            <div className="mt-7">
              <p className="text-caption font-bold tracking-[0.08em] text-accent">이 검사가 읽는 것</p>
              <p className="mt-3 max-w-prose text-body text-foreground-body">{definition.description}</p>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-2 text-caption text-foreground-body">
              <p className="flex min-h-11 items-center gap-2 border-l-2 border-primary-soft-border pl-3"><Icon name="check" className="size-4 text-primary" />정답 대신 가까운 쪽</p>
              <p className="flex min-h-11 items-center gap-2 border-l-2 border-accent-soft pl-3"><Icon name="message" className="size-4 text-accent" />결과는 대화의 시작</p>
            </div>
            <StartAssessmentControls slug={definition.slug} />
          </div>

          <AssessmentMapPanel
            axes={definition.axes}
            options={definition.scale.options}
            responseScaleGuide={presentation?.responseScaleGuide}
          />
        </section>

        <AnswerGuide />

        <section className="mt-14 sm:mt-16" aria-labelledby="process-title">
          <p className="text-caption font-semibold tracking-[0.08em] text-primary-active">진행 방식</p>
          <h2 id="process-title" className="mt-2 text-h1 text-foreground">답하고, 읽고, 한마디 나눠 보세요</h2>
          <ol className="mt-7 grid gap-3 md:grid-cols-3">
            {[
              ["01", "답하기", "요즘의 나를 떠올리며 다섯 선택지 중 가까운 쪽을 고릅니다.", "check"],
              ["02", "결과 읽기", "네 가지 관점으로 나의 교실 운영 리듬을 천천히 살펴봅니다.", "compass"],
              ["03", "대화하기", "마음에 남은 문장을 옆 동료와 가볍게 나눠 봅니다.", "message"],
            ].map(([number, title, body, icon]) => (
              <li key={number} className="assessment-card relative overflow-hidden p-5">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary-soft-border" />
                <div className="flex items-center justify-between"><span className="rounded-xs bg-accent-soft px-2 py-1 text-caption font-bold tabular-nums text-accent">{number}</span><Icon name={icon as "check" | "compass" | "message"} className="text-primary" /></div>
                <h3 className="mt-4 text-h3 text-foreground">{title}</h3>
                <p className="mt-2 text-body-sm text-foreground-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <ResultTakeaways />

        <section className="mt-14 grid gap-3 md:grid-cols-2">
          <div className="assessment-card flex gap-4 p-5 sm:p-6"><span className="grid size-10 shrink-0 place-items-center rounded-sm bg-accent-soft text-accent"><Icon name="compass" /></span><div><h2 className="text-h3 text-foreground">가볍게 발견하는 도구예요</h2><p className="mt-2 text-body-sm text-foreground-muted">{DISCLAIMER}</p></div></div>
          <div className="assessment-card flex gap-4 p-5 sm:p-6"><span className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary-soft text-primary"><Icon name="lock" /></span><div><h2 className="text-h3 text-foreground">내 기록은 이 기기에만 남아요</h2><p className="mt-2 text-body-sm text-foreground-muted">{PRIVACY_NOTE.long}</p></div></div>
        </section>

        <section className="assessment-card mt-14 overflow-hidden p-5 sm:p-7">
          <h2 className="text-h2 text-foreground">검사 안내</h2>
          <p className="mt-2 text-body-sm text-foreground-muted">시작하기 전에 궁금할 만한 내용을 짧게 모았어요.</p>
          <div className="mt-5 border-t border-border">
            <Accordion summary="어떤 순서로 진행되나요?">
              <p>문항은 {sections.length}개 챕터로 나뉘고, 한 화면에는 약 {Math.round(definition.questions.length / Math.max(sections.length, 1))}문항이 나옵니다. 답을 고를 때마다 바로 저장되어 중간에 멈춰도 이어서 할 수 있어요.</p>
            </Accordion>
            <Accordion summary="답을 고치고 싶으면요?">
              <p>언제든 다시 고르면 됩니다. 이전 챕터로 돌아가도 마지막에 고른 답이 그대로 저장돼요.</p>
            </Accordion>
            <Accordion summary="모든 문항에 답해야 하나요?">
              <p>결과를 보려면 모든 문항에 답해야 해요. 빠진 문항이 있으면 그 자리로 안내해 드립니다.</p>
            </Accordion>
          </div>
        </section>
      </main>

      <SiteFooter />
    </AssessmentTheme>
  );
}
