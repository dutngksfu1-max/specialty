import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import { resolveAxisCombinations } from "@/domain/assessment/result/axisCombination";
import type { ResultProfile, SceneNote } from "@/domain/assessment/result/profile";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { AxisBar } from "@/features/result/AxisBar";
import { TypeEmblem } from "@/features/result/TypeEmblem";
import { DISCLAIMER } from "@/lib/siteCopy";

/**
 * 결과 본문 (DEC-038 · DEC-045)
 *
 * 콘텐츠 순서는 유지하되, 같은 무게로 흩어져 있던 내용을 네 개의 장으로 묶습니다.
 * 결과 키는 내부 식별자이므로 화면에 출력하지 않습니다.
 */

const RESULT_NAVIGATION = [
  { href: "#result-overview", number: "01", label: "한눈에 보는 나" },
  { href: "#result-scenes", number: "02", label: "교실에서의 모습" },
  { href: "#result-collaboration", number: "03", label: "함께 일하는 방식" },
  { href: "#result-next", number: "04", label: "다음 대화로" },
] as const;

function ResultNavigation() {
  return (
    <nav
      aria-label="결과 내용 바로가기"
      className="rounded-lg border border-border bg-surface shadow-elev-1 lg:sticky lg:top-6"
    >
      <p className="border-b border-border px-4 py-3 text-caption font-semibold text-foreground-subtle">
        결과 순서
      </p>
      <ol className="grid grid-cols-2 lg:grid-cols-1">
        {RESULT_NAVIGATION.map((item, index) => (
          <li
            key={item.href}
            className={`${index >= 2 ? "border-t border-border" : ""} ${index % 2 === 1 ? "border-l border-border lg:border-l-0" : ""} ${index > 0 ? "lg:border-t lg:border-border" : ""}`}
          >
            <a
              href={item.href}
              className="flex min-h-12 items-center gap-3 px-4 py-3 text-body-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <span className="font-bold tabular-nums text-accent" aria-hidden="true">
                {item.number}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ChapterHeading({
  number,
  title,
  description,
}: {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <header className="border-b border-border pb-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-primary-soft-border bg-primary-soft text-caption font-bold tabular-nums text-primary-active"
        >
          {number}
        </span>
        <h2 className="text-h1 text-foreground sm:text-h1-lg">{title}</h2>
      </div>
      <p className="mt-3 max-w-prose text-body text-foreground-muted">{description}</p>
    </header>
  );
}

function Points({ items, icon = "check" }: { readonly items: readonly string[]; readonly icon?: IconName }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary-soft text-primary-active">
            <Icon name={icon} className="size-4" />
          </span>
          <span className="max-w-prose">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function iconForScene(scene: string): IconName {
  if (scene.includes("수업") || scene.includes("교실")) return "book";
  if (scene.includes("동료") || scene.includes("회의")) return "message";
  if (scene.includes("업무") || scene.includes("준비")) return "layers";
  return "compass";
}

function ScenePoints({ items }: { readonly items: readonly SceneNote[] }) {
  return (
    <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map((item) => (
        <li key={`${item.scene}-${item.text}`} className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-xs bg-primary-soft px-2 py-1 text-body-sm font-medium text-primary-active">
            <Icon name={iconForScene(item.scene)} className="size-4" />
            {item.scene}
          </span>
          <p className="mt-2 text-body text-foreground-body">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

function SceneGroup({
  title,
  description,
  icon,
  items,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
  readonly items: readonly SceneNote[];
}) {
  return (
    <section className="p-5 sm:p-7">
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
          <Icon name={icon} />
        </span>
        <div>
          <h3 className="text-h3 text-foreground sm:text-h3-lg">{title}</h3>
          <p className="mt-1 text-body-sm text-foreground-muted">{description}</p>
        </div>
      </div>
      <ScenePoints items={items} />
    </section>
  );
}

function NumberedPoints({ items }: { readonly items: readonly string[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface text-caption font-bold tabular-nums text-primary-active"
          >
            {index + 1}
          </span>
          <span className="max-w-prose">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function ActionPanel({
  title,
  description,
  icon,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <Icon name={icon} className="text-accent" />
      <h3 className="mt-4 text-h3 text-foreground">{title}</h3>
      <p className="mt-2 text-body-sm text-foreground-muted">{description}</p>
      <div className="mt-5 text-body text-foreground-body">{children}</div>
    </section>
  );
}

export function ResultRenderer({
  definition,
  snapshot,
  profile,
  nickname,
}: {
  readonly definition: AssessmentDefinition;
  readonly snapshot: ResultSnapshot;
  readonly profile: ResultProfile;
  readonly nickname: string;
}) {
  const axisById = new Map(definition.axes.map((axis) => [String(axis.id), axis]));
  const combinationReadings = resolveAxisCombinations(definition.axisCombinations, profile.poles);

  return (
    <article>
      {/* 닉네임 → 결과 제목 → 한 줄 설명 → 엠블럼 → 교직 리듬 */}
      <header className="relative overflow-hidden rounded-(--radius-hero) border border-primary-soft-border bg-primary-soft p-6 shadow-elev-1 sm:p-9 lg:p-10">
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 size-32 border-b border-l border-primary-soft-border bg-surface opacity-40"
        />
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-caption font-semibold text-primary-active">검사 결과 · {nickname} 님</p>
            <h1 className="mt-3 max-w-prose text-display text-foreground sm:text-display-lg">
              {profile.title}
            </h1>
            <p className="mt-5 max-w-prose text-h3 font-medium text-foreground-body">
              {profile.oneLiner}
            </p>
          </div>

          <div className="relative z-10 justify-self-start rounded-lg border border-primary-soft-border bg-surface p-4 shadow-elev-1 md:justify-self-end">
            <TypeEmblem
              axisIds={definition.axes.map((axis) => axis.id)}
              poles={profile.poles}
              size={168}
              label={`${profile.title} 결과를 나타내는 상징`}
            />
          </div>
        </div>

        <div className="relative mt-8 grid gap-3 border-t border-primary-soft-border pt-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-7">
          <p className="text-label text-primary-active">나의 교직 리듬</p>
          <p className="max-w-prose text-body-lg text-foreground-body sm:text-body-lg-desktop">
            {profile.rhythm}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-4 lg:items-start">
        <div className="lg:col-start-4 lg:row-start-1">
          <ResultNavigation />
        </div>

        <div className="min-w-0 lg:col-span-3 lg:col-start-1 lg:row-start-1">
          {/* 네 가지 축 → 축 조합 해석 */}
          <section id="result-overview" className="scroll-mt-28">
            <ChapterHeading
              number="01"
              title="한눈에 보는 나"
              description="네 축의 위치와 축들이 함께 만들어 내는 흐름을 먼저 살펴보세요. 어느 한쪽이 더 좋은 것은 아니며, 가운데에 가까울수록 두 방식이 비슷하게 나타납니다."
            />

            <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface px-5 sm:px-7">
              {snapshot.score.axisScores.map((score) => {
                const axis = axisById.get(String(score.axisId));
                if (axis === undefined) return null;
                return (
                  <div key={String(score.axisId)} className="border-b border-border last:border-b-0">
                    <AxisBar axis={axis} score={score} />
                  </div>
                );
              })}
            </div>
            <p className="mt-4 max-w-prose text-body-sm text-foreground-subtle">
              강도 표시는 통계 규준이나 등급이 아니라, 결과를 이야기하기 쉽게 나눈 구분이에요.
            </p>

            {combinationReadings.length > 0 && (
              <div className="mt-10">
                <h3 className="text-h3 text-foreground sm:text-h3-lg">축이 함께 움직일 때</h3>
                <p className="mt-2 max-w-prose text-body text-foreground-muted">
                  한 축씩 볼 때보다 두 관점이 만나는 지점에서 실제 업무 방식이 더 또렷하게 드러납니다.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {combinationReadings.map((combination) => (
                    <section
                      key={combination.id}
                      className="rounded-lg border border-border bg-surface p-5"
                    >
                      <h4 className="text-label text-primary-active">{combination.title}</h4>
                      <p className="mt-3 text-body text-foreground-body">{combination.text}</p>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 교실에서 빛나는 순간 → 바쁠 때 → 동료와 함께 일할 때 */}
          <section id="result-scenes" className="mt-16 scroll-mt-28">
            <ChapterHeading
              number="02"
              title="교실에서 드러나는 모습"
              description="결과를 추상적인 설명으로만 읽지 않고, 수업·생활지도·업무처럼 실제 장면에 놓아 보았습니다."
            />
            <div className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
              <SceneGroup
                title="교실에서 빛나는 순간"
                description="자연스럽게 강점이 드러나는 장면이에요."
                icon="check"
                items={profile.shiningMoments}
              />
              <SceneGroup
                title="바쁠 때 나타날 수 있는 모습"
                description="단점이라기보다 여유가 줄었을 때 먼저 살펴볼 신호예요."
                icon="warning"
                items={profile.underPressure}
              />
              <SceneGroup
                title="동료와 함께 일할 때"
                description="학년과 학교 안에서 이 리듬이 보이는 방식이에요."
                icon="message"
                items={profile.withColleagues}
              />
            </div>
          </section>

          {/* 호흡이 자연스러운 스타일 → 조율하면 더 편한 스타일 */}
          <section id="result-collaboration" className="mt-16 scroll-mt-28">
            <ChapterHeading
              number="03"
              title="함께 일하는 방식"
              description="누가 더 잘 맞는지를 가르는 내용이 아니라, 서로 다른 리듬 사이에서 무엇이 자연스럽고 무엇을 먼저 말해 두면 좋은지 보여 줍니다."
            />
            <div className="mt-6 grid overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-2 md:divide-x md:divide-border">
              <section className="border-b border-border p-5 md:border-b-0 sm:p-7">
                <p className="text-caption font-semibold text-primary-active">자연스럽게 이어지는 지점</p>
                <h3 className="mt-2 text-h3 text-foreground">호흡이 자연스러운 스타일</h3>
                <div className="mt-5 text-body text-foreground-body">
                  <Points items={profile.collaboration.naturalFit} />
                </div>
              </section>
              <section className="p-5 sm:p-7">
                <p className="text-caption font-semibold text-accent">먼저 말해 두면 좋은 지점</p>
                <h3 className="mt-2 text-h3 text-foreground">조율하면 더 편한 스타일</h3>
                <div className="mt-5 text-body text-foreground-body">
                  <Points items={profile.collaboration.needsTuning} icon="message" />
                </div>
              </section>
            </div>
          </section>

          {/* 내일 해 볼 것 → 동료와 나눌 질문 → 검사 안내 */}
          <section id="result-next" className="mt-16 scroll-mt-28">
            <ChapterHeading
              number="04"
              title="다음 대화로"
              description="결과를 읽는 데서 멈추지 않고, 내일의 작은 행동과 동료와의 대화로 이어 보세요."
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ActionPanel
                title="내일 해 볼 것"
                description="부담 없이 하나만 골라도 충분해요."
                icon="compass"
              >
                <NumberedPoints items={profile.nextSteps} />
              </ActionPanel>
              <ActionPanel
                title="동료와 나눌 질문"
                description="답을 맞히기보다 서로의 다름을 발견하는 질문이에요."
                icon="message"
              >
                <NumberedPoints items={profile.talkingPoints} />
              </ActionPanel>
            </div>

            <p className="mt-8 flex max-w-prose gap-3 rounded-lg border border-border bg-surface-muted p-5 text-body-sm text-foreground-muted">
              <Icon name="compass" className="mt-0.5 text-primary" />
              <span>{DISCLAIMER}</span>
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
