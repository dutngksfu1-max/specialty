import type { ReactNode } from "react";

import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import type { SceneNote } from "@/domain/assessment/result/profile";
import { resolveAxisCombinations } from "@/domain/assessment/result/axisCombination";
import { AxisBar } from "@/features/result/AxisBar";
import { TypeEmblem } from "@/features/result/TypeEmblem";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DISCLAIMER } from "@/lib/siteCopy";

/**
 * 결과 본문 (docs/design.md 11.1, PRD F-5.1)
 *
 * "결과표"가 아니라 **한 편의 글**입니다.
 * 카드를 나열하지 않고 제목·본문·여백으로 흐름을 만듭니다.
 *
 * 섹션 순서는 PRD에서 고정되어 있습니다. 임의로 바꾸지 않습니다.
 */

function ResultSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="mt-14 border-t border-border pt-8">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="block h-0.5 w-7 bg-accent" />
        <h2 className="text-h2 text-foreground sm:text-h2-lg">{title}</h2>
      </div>
      <div className="mt-4 text-body text-foreground-body">{children}</div>
    </section>
  );
}

function Points({ items }: { readonly items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Icon name="check" className="mt-1 size-4 shrink-0 text-accent" />
          <span className="max-w-prose">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * 장면이 붙은 서술 (contentVersion 3.0.0)
 *
 * 장면 칩을 함께 보여 주면, 선생님이 지금 궁금한 장면만 골라 읽을 수 있습니다.
 * 칩은 색만으로 구분하지 않고 글자 자체가 장면 이름이라 색 없이도 뜻이 전달됩니다.
 */
function ScenePoints({ items }: { readonly items: readonly SceneNote[] }) {
  const iconForScene = (scene: string): IconName => {
    if (scene.includes("수업") || scene.includes("교실")) return "book";
    if (scene.includes("동료") || scene.includes("회의")) return "message";
    if (scene.includes("업무") || scene.includes("준비")) return "layers";
    return "compass";
  };

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.text} className="border-l-2 border-primary-soft-border pl-4">
          <span className="inline-flex items-center gap-1.5 rounded-xs bg-primary-soft px-2 py-1 text-body-sm font-medium text-primary-active">
            <Icon name={iconForScene(item.scene)} className="size-4" /> {item.scene}
          </span>
          <p className="mt-2 max-w-prose">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

/** 번호가 붙은 실천 목록 — 순서가 정보를 담으므로 ol을 씁니다. */
function NumberedPoints({ items }: { readonly items: readonly string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-xs border border-border-strong bg-surface text-caption font-bold tabular-nums text-primary-active"
          >
            {index + 1}
          </span>
          <span className="max-w-prose">{item}</span>
        </li>
      ))}
    </ol>
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
      {/* 1. 닉네임 → 2. 결과 제목 → 3. 한 줄 설명 → 4. 유형 엠블럼 (DEC-039) */}
      <header className="relative overflow-hidden rounded-(--radius-hero) border border-border bg-surface p-6 shadow-elev-1 sm:p-9">
        <span aria-hidden="true" className="absolute top-0 right-0 h-28 w-28 border-b border-l border-primary-soft-border opacity-70" />
        <div className="relative grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-caption font-semibold text-primary-active">{nickname} 님의 교직 리듬</p>
            <h1 className="mt-3 text-display text-foreground sm:text-display-lg">{profile.title}</h1>
            <p className="mt-4 max-w-prose text-body-lg text-foreground-muted sm:text-body-lg-desktop">
              {profile.oneLiner}
            </p>
          </div>
          <div className="justify-self-start sm:justify-self-end">
          <TypeEmblem
            axisIds={definition.axes.map((axis) => axis.id)}
            poles={profile.poles}
            size={112}
            label={`${profile.title} 유형을 나타내는 상징`}
          />
          </div>
        </div>
      </header>

      {/* 4. 나의 교직 리듬 */}
      <ResultSection title="나의 교직 리듬">
        <p className="max-w-prose">{profile.rhythm}</p>
      </ResultSection>

      {/* 5. 4개 성향 축 */}
      <ResultSection title="네 가지 축으로 본 나">
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface px-4 sm:px-6">
          {snapshot.score.axisScores.map((score) => {
            const axis = axisById.get(String(score.axisId));
            if (axis === undefined) return null;
            return <AxisBar key={String(score.axisId)} axis={axis} score={score} />;
          })}
        </div>
        <p className="mt-6 max-w-prose text-body-sm text-foreground-subtle">
          이 구간 표시는 통계 규준이 아니라, 결과를 이야기하기 쉽게 나눈 구분이에요.
        </p>
      </ResultSection>

      {/* 5b. 축 조합 해석 — 두 축이 만났을 때만 보이는 이야기 */}
      {combinationReadings.map((combination) => (
        <ResultSection key={combination.id} title={combination.title}>
          <p className="max-w-prose">{combination.text}</p>
        </ResultSection>
      ))}

      {/* 6~8. 프로필 본문 */}
      <ResultSection title="교실에서 빛나는 순간">
        <ScenePoints items={profile.shiningMoments} />
      </ResultSection>

      <ResultSection title="바쁠 때 나타날 수 있는 모습">
        <ScenePoints items={profile.underPressure} />
      </ResultSection>

      <ResultSection title="동료와 함께 일할 때">
        <ScenePoints items={profile.withColleagues} />
      </ResultSection>

      {/* 9~10. 협업 — "궁합" 표현을 쓰지 않습니다 (PRD F-5.3) */}
      <ResultSection title="호흡이 자연스러운 스타일">
        <Points items={profile.collaboration.naturalFit} />
      </ResultSection>

      <ResultSection title="조율하면 더 편한 스타일">
        <Points items={profile.collaboration.needsTuning} />
      </ResultSection>

      {/* 11~12. 성향 서술에서 끝내지 않고 해 볼 것으로 넘깁니다 */}
      <ResultSection title="내일 해 볼 것">
        <NumberedPoints items={profile.nextSteps} />
      </ResultSection>

      <ResultSection title="동료와 나눌 질문">
        <NumberedPoints items={profile.talkingPoints} />
        <p className="mt-6 max-w-prose text-body-sm text-foreground-subtle">
          옆자리 선생님과 한 문항씩 주고받아 보세요. 답을 맞히는 자리가 아니라 서로의 다름을 확인하는 자리예요.
        </p>
      </ResultSection>

      <p className="mt-14 flex max-w-prose gap-3 border-t border-border pt-7 text-body-sm text-foreground-muted">
        <Icon name="compass" className="mt-0.5 text-primary" /> {DISCLAIMER}
      </p>
    </article>
  );
}
