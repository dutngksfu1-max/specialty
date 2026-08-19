import type { ReactNode } from "react";

import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { AxisBar } from "@/features/result/AxisBar";
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
    <section className="mt-12">
      <span aria-hidden="true" className="block h-0.5 w-6 bg-accent" />
      <h2 className="mt-3 text-h2 text-foreground sm:text-h2-lg">{title}</h2>
      <div className="mt-4 text-body text-foreground-body">{children}</div>
    </section>
  );
}

function Points({ items }: { readonly items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden="true" className="mt-3 h-1 w-1 shrink-0 rounded-full bg-accent" />
          <span className="max-w-prose">{item}</span>
        </li>
      ))}
    </ul>
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

  return (
    <article>
      {/* 1. 닉네임 → 2. 결과 제목 → 3. 한 줄 설명 */}
      <header className="max-w-[48rem]">
        <p className="text-caption text-foreground-subtle">{nickname} 님의 결과</p>
        <h1 className="mt-3 text-display text-foreground sm:text-display-lg">{profile.title}</h1>
        <p className="mt-4 max-w-prose text-body-lg text-foreground-muted sm:text-body-lg-desktop">
          {profile.oneLiner}
        </p>
      </header>

      <hr className="mt-10 border-border" />

      {/* 4. 나의 교직 리듬 */}
      <ResultSection title="나의 교직 리듬">
        <p className="max-w-prose">{profile.rhythm}</p>
      </ResultSection>

      {/* 5. 4개 성향 축 */}
      <ResultSection title="네 가지 축으로 본 나">
        <div className="flex flex-col divide-y divide-border">
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

      {/* 6~8. 프로필 본문 */}
      <ResultSection title="교실에서 빛나는 순간">
        <Points items={profile.shiningMoments} />
      </ResultSection>

      <ResultSection title="바쁠 때 나타날 수 있는 모습">
        <Points items={profile.underPressure} />
      </ResultSection>

      <ResultSection title="동료와 함께 일할 때">
        <Points items={profile.withColleagues} />
      </ResultSection>

      {/* 9~10. 협업 — "궁합" 표현을 쓰지 않습니다 (PRD F-5.3) */}
      <ResultSection title="호흡이 자연스러운 스타일">
        <Points items={profile.collaboration.naturalFit} />
      </ResultSection>

      <ResultSection title="조율하면 더 편한 스타일">
        <Points items={profile.collaboration.needsTuning} />
      </ResultSection>

      <p className="mt-12 max-w-prose text-body-sm text-foreground-muted">
        <span aria-hidden="true">ℹ </span>
        {DISCLAIMER}
      </p>
    </article>
  );
}
