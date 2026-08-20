import { forwardRef } from "react";

import type { AssessmentDefinition } from "@/domain/assessment/model/definition";
import { resolveResultNarrative } from "@/domain/assessment/result/narrative";
import type { ResultProfile } from "@/domain/assessment/result/profile";
import type { ResultSnapshot } from "@/domain/assessment/result/snapshot";
import { AxisBar } from "@/features/result/AxisBar";
import { TypeEmblem } from "@/features/result/TypeEmblem";
import { BRAND_NAME } from "@/lib/siteCopy";

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

/**
 * 저장용 결과 이미지 (docs/design.md 11.3, DEC-008)
 *
 * 1080 × 1350 고정입니다. 화면에는 보이지 않는 위치에 두고 이 노드만 캡처합니다.
 * 버튼·내비게이션이 함께 찍히지 않도록 캡처 대상을 전용 컨테이너 하나로 한정합니다.
 *
 * `display: none`을 쓰지 않는 이유: 크기가 0이 되어 캡처가 빈 이미지로 나옵니다.
 * 그래서 화면 밖으로 밀어 두고 `aria-hidden`으로 보조기기에서만 감춥니다.
 */
export const ResultShareCard = forwardRef<
  HTMLDivElement,
  {
    readonly definition: AssessmentDefinition;
    readonly snapshot: ResultSnapshot;
    readonly profile: ResultProfile;
    readonly nickname: string;
  }
>(function ResultShareCard({ definition, snapshot, profile, nickname }, ref) {
  const axisById = new Map(definition.axes.map((axis) => [String(axis.id), axis]));
  const narrative = resolveResultNarrative(definition, snapshot.score.axisScores, profile);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: -20000,
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        padding: 80,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        background: "var(--color-background)",
        color: "var(--color-foreground-body)",
        fontFamily: "var(--font-sans)",
        pointerEvents: "none",
      }}
    >
      <svg
        viewBox="0 0 360 180"
        aria-hidden="true"
        style={{ position: "absolute", top: 42, right: 42, width: 320, height: 160, opacity: 0.34 }}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M15 126c48-8 68-42 111-34 38 7 53 38 93 27 34-9 56-44 126-67" />
        <circle cx="126" cy="92" r="9" fill="var(--color-accent-soft)" />
        <path d="M242 103V46h64v57M274 46v57" />
      </svg>
      <p style={{ fontSize: 24, color: "var(--color-foreground-subtle)", margin: 0 }}>
        {BRAND_NAME}
      </p>

      {/* 유형 엠블럼 — 카드 전체가 aria-hidden이므로 decorative로 넘깁니다 */}
      {narrative.balancedAxisIds.size === 0 && (
        <div style={{ marginTop: 40 }}>
          <TypeEmblem
            axisIds={definition.axes.map((axis) => axis.id)}
            poles={profile.poles}
            size={132}
            decorative
          />
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 26, color: "var(--color-foreground-subtle)" }}>
        {nickname} 님의 결과
      </p>

      <h2
        style={{
          marginTop: 16,
          fontSize: 62,
          lineHeight: 1.25,
          letterSpacing: "-0.02em",
          fontWeight: 700,
          color: "var(--color-foreground)",
          wordBreak: "keep-all",
        }}
      >
        {narrative.title}
      </h2>

      <p
        style={{
          marginTop: 24,
          fontSize: 28,
          lineHeight: 1.6,
          color: "var(--color-foreground-muted)",
          wordBreak: "keep-all",
        }}
      >
        {narrative.oneLiner}
      </p>

      <div
        style={{
          marginTop: 48,
          paddingTop: 8,
          borderTop: "1px solid var(--color-border)",
          flex: 1,
        }}
      >
        {snapshot.score.axisScores.map((score) => {
          const axis = axisById.get(String(score.axisId));
          if (axis === undefined) return null;
          return (
            <div
              key={String(score.axisId)}
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <AxisBar axis={axis} score={score} variant="share" />
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 24, fontSize: 20, color: "var(--color-foreground-subtle)" }}>
        표준화된 심리검사가 아니라, 자기 이해와 대화를 돕기 위한 탐색 도구예요.
      </p>
    </div>
  );
});
