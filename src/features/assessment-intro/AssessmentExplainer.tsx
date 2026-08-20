import { Icon, type IconName } from "@/components/ui/Icon";
import type { AssessmentAxis, ResponseOption } from "@/domain/assessment/model/definition";

const perspectiveIcons: readonly IconName[] = ["message", "compass", "check", "clock"];

export function AssessmentMapPanel({
  axes,
  options,
}: {
  readonly axes: readonly AssessmentAxis[];
  readonly options: readonly ResponseOption[];
}) {
  return (
    <section className="relative h-full min-w-0 overflow-hidden border-t border-primary-soft-border bg-primary-soft p-5 sm:p-7 lg:border-t-0 lg:border-l lg:p-8" aria-labelledby="assessment-map-title">
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-caption font-bold tracking-[0.08em] text-primary-active">교직 리듬 탐색 지도</p>
            <h2 id="assessment-map-title" className="mt-2 text-h2 text-foreground">결과를 만드는 {axes.length}개의 관점</h2>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-primary-soft-border bg-surface text-primary-active shadow-elev-1">
            <Icon name="compass" />
          </span>
        </div>
        <p className="mt-3 max-w-prose text-body-sm text-foreground-muted">
          각 관점의 두 방향 사이에서 지금 나에게 가까운 위치를 찾고, 그 조합을 하나의 교직 리듬으로 읽습니다.
        </p>

        <ol className="mt-6 grid grid-cols-2 gap-2.5">
          {axes.map((axis, index) => {
            const icon = perspectiveIcons[index % perspectiveIcons.length] ?? "compass";
            return (
              <li key={String(axis.id)} className="assessment-mini-card relative overflow-hidden p-4">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary-soft-border" />
                <div className="flex items-center justify-between gap-2">
                  <Icon name={icon} className="size-4 text-primary" />
                  <span className="text-caption font-bold tabular-nums text-accent">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-3 text-label text-foreground">{axis.name}</h3>
                <div className="mt-4 flex items-center justify-between gap-2 text-caption font-semibold text-foreground-body">
                  <span>{axis.positive.shortLabel}</span>
                  <span>{axis.negative.shortLabel}</span>
                </div>
                <div aria-hidden="true" className="mt-2 flex items-center gap-1">
                  <span className="h-1 flex-1 rounded-full bg-primary-soft-border" />
                  <span className="size-2 rounded-full border-2 border-surface bg-accent" />
                  <span className="h-1 flex-1 rounded-full bg-accent-soft" />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 border-t border-primary-soft-border pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-caption font-bold tracking-[0.08em] text-accent">응답 척도</p>
              <h3 className="mt-1 text-h3 text-foreground">다섯 단계로 답해요</h3>
            </div>
            <span className="text-caption text-foreground-muted">가까운 쪽을 선택</span>
          </div>
          <ol className="mt-4 grid grid-cols-2 gap-2">
            {options.map((option) => (
              <li key={option.value} className="flex min-h-11 min-w-0 items-center gap-2 rounded-sm border border-primary-soft-border bg-surface px-3 text-caption font-semibold text-foreground-body last:col-span-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-xs bg-primary-soft text-caption font-bold tabular-nums text-primary-active">
                  {option.value}
                </span>
                <span className="min-w-0">{option.visibleLabel ?? option.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const takeawayItems = [
  {
    number: "01",
    icon: "book" as const,
    title: "나의 교직 리듬",
    body: "네 관점이 함께 나타날 때의 모습을 한 편의 설명으로 읽어요.",
  },
  {
    number: "02",
    icon: "layers" as const,
    title: "기울기와 균형",
    body: "한쪽으로 단정하지 않고 두 방향 사이의 위치와 균형을 함께 봐요.",
  },
  {
    number: "03",
    icon: "message" as const,
    title: "동료와 나눌 한마디",
    body: "강의에서 바로 꺼내 이야기할 수 있는 질문으로 마무리해요.",
  },
] as const;

export function ResultTakeaways() {
  return (
    <section className="assessment-card assessment-card-deck mt-12 overflow-hidden p-5 sm:mt-16 sm:p-8" aria-labelledby="takeaways-title">
      <div className="assessment-rule" aria-hidden="true" />
      <div className="mt-6 grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10">
        <div>
          <p className="text-caption font-bold tracking-[0.08em] text-primary-active">검사가 끝나면</p>
          <h2 id="takeaways-title" className="mt-2 text-h1 text-foreground">결과를 읽고 대화로 이어가요</h2>
          <p className="mt-3 text-body-sm text-foreground-muted">
            결과를 이름표처럼 붙이는 대신, 내가 편하게 움직이는 방식과 동료와 맞춰 볼 지점을 담백하게 정리합니다.
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {takeawayItems.map((item) => (
            <li key={item.number} className="assessment-mini-card p-4">
              <div className="flex items-center justify-between gap-3">
                <Icon name={item.icon} className="text-primary" />
                <span className="text-caption font-bold tabular-nums text-accent">{item.number}</span>
              </div>
              <h3 className="mt-4 text-label text-foreground">{item.title}</h3>
              <p className="mt-2 text-body-sm text-foreground-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const answerGuideItems = [
  ["01", "요즘의 나", "가장 이상적인 모습보다 최근의 나에게 더 자주 보이는 모습을 떠올려요."],
  ["02", "가까운 쪽", "상황마다 달랐다면 완벽히 맞는 답을 찾기보다 조금 더 가까운 쪽을 골라요."],
  ["03", "첫 느낌", "오래 분석할 필요 없어요. 문장을 읽고 먼저 떠오른 장면을 기준으로 답해요."],
] as const;

export function AnswerGuide() {
  return (
    <section className="mt-14" aria-labelledby="answer-guide-title">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-caption font-bold tracking-[0.08em] text-accent">답을 고르는 기준</p>
          <h2 id="answer-guide-title" className="mt-2 text-h1 text-foreground">편안하게 답해도 괜찮아요</h2>
        </div>
        <Icon name="check" className="hidden size-8 text-primary sm:block" />
      </div>
      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {answerGuideItems.map(([number, title, body]) => (
          <li key={number} className="assessment-card p-5">
            <span className="inline-flex rounded-xs border border-primary-soft-border bg-primary-soft px-2 py-1 text-caption font-bold tabular-nums text-primary-active">
              {number}
            </span>
            <h3 className="mt-4 text-h3 text-foreground">{title}</h3>
            <p className="mt-2 text-body-sm text-foreground-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
